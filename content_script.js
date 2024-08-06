(function() {
  const coursesUrl = 'https://willrosenthal.github.io/whats-that-course/courses.json';

  const clearPrevious = () => {
    document.querySelectorAll('.course-link').forEach(link => {
      const parent = link.parentNode;
      parent.replaceChild(document.createTextNode(link.innerText), link);
    });

    const existingTooltip = document.getElementById('course-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
  };

  const performCourseDetection = (courses) => {
    const regexes = Object.keys(courses).flatMap(dept =>
      Object.keys(courses[dept]).map(num =>
        new RegExp(`\\b${dept}\\s*${num}\\b`, 'gi')
      )
    );

    const walkDOM = (node) => {
      let child = node.firstChild;
      while (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          let replacedHTML = child.nodeValue;
          regexes.forEach(regex => {
            replacedHTML = replacedHTML.replace(regex, match => {
              const dept = match.match(/[A-Z]+/i)[0].toUpperCase();
              const num = match.match(/\d+/)[0];
              const course = courses[dept] && courses[dept][num];
              const title = course ? course.titleLong : '';
              const link = course ? course.courseLink : '#';
              return `<a href="${link}" target="_blank" style="color: #4CAF50; font-weight: bold;" title="${title}" class="course-link">${match}</a>`;
            });
          });
          if (replacedHTML !== child.nodeValue) {
            const span = document.createElement('span');
            span.innerHTML = replacedHTML;
            node.replaceChild(span, child);
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walkDOM(child);
        }
        child = child.nextSibling;
      }
    };

    walkDOM(document.body);

    const tooltip = document.createElement('div');
    tooltip.id = 'course-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '1000';
    tooltip.style.fontSize = '12px';
    document.body.appendChild(tooltip);

    document.querySelectorAll('.course-link').forEach(link => {
      let originalTitle = '';

      link.addEventListener('mouseover', (event) => {
        originalTitle = event.target.getAttribute('title');
        event.target.removeAttribute('title');
        tooltip.innerText = originalTitle;
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
        tooltip.style.display = 'block';
      });

      link.addEventListener('mouseout', (event) => {
        event.target.setAttribute('title', originalTitle);
        tooltip.style.display = 'none';
      });

      link.addEventListener('mousemove', (event) => {
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
      });
    });

    chrome.runtime.sendMessage({ action: 'detectionComplete' }, (response) => {
      console.log('Detection complete message sent', response);
    });
  };

  fetch(coursesUrl)
    .then(response => response.json())
    .then(courses => {
      clearPrevious();
      performCourseDetection(courses);
    })
    .catch(error => {
      console.error('Error fetching courses data:', error);
    });
})();