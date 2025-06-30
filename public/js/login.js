function toggleForm(signup) {
  const container = document.getElementById('container');
  if (signup) {
    container.classList.add("right-panel-active");
  } else {
    container.classList.remove("right-panel-active");
  }
}


 document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.target.parentElement.style.opacity = '0';
    setTimeout(() => {
      e.target.parentElement.remove();
    }, 300);
  });
});