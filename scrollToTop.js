// scrollToTop.js
document.addEventListener('DOMContentLoaded', function () {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    // Показуємо/ховаємо кнопку при прокрутці
    window.addEventListener('scroll', function () {
        if (window.scrollY > 300) { // Показуємо кнопку, якщо прокрутка більше 300px
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    });

    // Плавна прокрутка наверх при натисканні
    scrollToTopBtn.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});