document.addEventListener('DOMContentLoaded', () => {
  const coursesUrl = 'https://willrosenthal.github.io/whats-that-course/courses.json';

  const fetchCoursesData = () => {
    return fetch(coursesUrl)
      .then(response => response.json())
      .then(courses => {
        chrome.storage.local.set({ coursesData: courses });
        return courses;
      })
      .catch(error => {
        console.error('Error fetching courses data:', error);
      });
  };

  const truncateText = (text, maxLength) => 
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  const displayCourseNotFound = () => {
    const courseNameDiv = document.getElementById('courseName');
    courseNameDiv.textContent = 'Course not found';
    courseNameDiv.style.color = 'red';
    showResetButton();
  };

  const showResetButton = () => {
    document.getElementById('resetButton').style.display = 'block';
  };

  const searchCourse = (courseCode, courses) => {
    courseCode = courseCode.trim().toUpperCase().replace(/\s+/g, ' ');

    const match = courseCode.match(/^([A-Z]+)\s*([\d]+)$/);
    if (!match) {
      displayCourseNotFound();
      return;
    }

    const deptCode = match[1];
    const courseNumber = match[2];
    const courseInfo = courses[deptCode] && courses[deptCode][courseNumber];

    const courseNameDiv = document.getElementById('courseName');

    if (courseInfo) {
      const { titleLong, description, courseLink } = courseInfo;
      const truncatedDescription = truncateText(description, 200);
      const isTruncated = description.length > 200;

      courseNameDiv.innerHTML = `
        <strong>${titleLong}</strong><br>
        <span id="courseDescription">${truncatedDescription}</span>
        ${isTruncated ? '<a href="#" id="toggleDescription">Expand</a>' : ''}
        <hr>
        <div style="text-align: center;">
          <a href="${courseLink}" target="_blank" class="view-button">View Course</a>
        </div>
      `;
      courseNameDiv.style.color = 'black';

      if (isTruncated) {
        document.getElementById('toggleDescription').addEventListener('click', (event) => {
          event.preventDefault();
          const descriptionSpan = document.getElementById('courseDescription');
          if (descriptionSpan.textContent.endsWith('...')) {
            descriptionSpan.textContent = description;
            event.target.innerHTML = 'Collapse';
          } else {
            descriptionSpan.textContent = truncatedDescription;
            event.target.innerHTML = 'Expand';
          }
        });
      }
    } else {
      displayCourseNotFound();
    }
    showResetButton();
  };

  const setDetectCoursesButtonState = (isRunning) => {
    const detectCoursesButton = document.getElementById('detectCoursesButton');
    detectCoursesButton.disabled = isRunning;
    chrome.storage.local.set({ detectCoursesRunning: isRunning });
  };

  let loadingInterval;
  const startLoadingAnimation = () => {
    const detectCoursesButton = document.getElementById('detectCoursesButton');
    if (loadingInterval) {
      clearInterval(loadingInterval);
    }
    let loadingDots = 0;
    loadingInterval = setInterval(() => {
      detectCoursesButton.textContent = 'Detecting Courses' + '.'.repeat(loadingDots);
      loadingDots = (loadingDots + 1) % 4;
    }, 300);
  };

  const stopLoadingAnimation = () => {
    const detectCoursesButton = document.getElementById('detectCoursesButton');
    clearInterval(loadingInterval);
    detectCoursesButton.textContent = 'Detect Courses';
  };

  chrome.storage.local.get(['courseCode', 'detectCoursesRunning', 'coursesData'], (result) => {
    const { courseCode, detectCoursesRunning, coursesData } = result;

    if (courseCode) {
      document.getElementById('courseCode').value = courseCode;
      searchCourse(courseCode, coursesData);
      chrome.storage.local.remove('courseCode');
    }

    if (detectCoursesRunning) {
      setDetectCoursesButtonState(true);
      startLoadingAnimation();
    } else {
      stopLoadingAnimation();
      setDetectCoursesButtonState(false);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.detectCoursesRunning) {
      const isRunning = changes.detectCoursesRunning.newValue;
      setDetectCoursesButtonState(isRunning);
      if (isRunning) {
        startLoadingAnimation();
      } else {
        stopLoadingAnimation();
      }
    }
  });

  document.getElementById('searchButton').addEventListener('click', () => {
    chrome.storage.local.get('coursesData', (result) => {
      searchCourse(document.getElementById('courseCode').value, result.coursesData);
    });
  });

  document.getElementById('courseCode').focus();
  document.getElementById('courseCode').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      chrome.storage.local.get('coursesData', (result) => {
        searchCourse(document.getElementById('courseCode').value, result.coursesData);
      });
    }
  });

  document.getElementById('resetButton').addEventListener('click', function() {
      document.getElementById('courseCode').value = '';
      document.getElementById('courseName').innerHTML = '';
      document.getElementById('resetButton').style.display = 'none';
  });

  document.getElementById('menuButton').addEventListener('click', () => {
    document.getElementById('sideMenu').classList.add('open');
  });

  document.getElementById('closeMenuButton').addEventListener('click', () => {
    document.getElementById('sideMenu').classList.remove('open');
  });

  document.getElementById('openHotkeySettings').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'chrome://extensions/configureCommands'
    });
  });

  document.getElementById('detectCoursesButton').addEventListener('click', () => {
    const detectCoursesButton = document.getElementById('detectCoursesButton');
    if (detectCoursesButton.disabled) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].url.startsWith('http') || tabs[0].url.startsWith('https')) {
        chrome.runtime.sendMessage({ action: 'startDetection' }, (response) => {
          if (response.status === 'ok') {
            setDetectCoursesButtonState(true);
            startLoadingAnimation();
          } else {
            alert('Failed to start detection.');
          }
        });

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content_script.js']
        });
      } else {
        alert('Cannot detect courses on this type of page.');
        setDetectCoursesButtonState(false);
        stopLoadingAnimation();
      }
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'detectionComplete') {
      setDetectCoursesButtonState(false);
      stopLoadingAnimation();
    }
  });

  fetchCoursesData();
});