// Apply fade-in effect when scrolling
const faders = document.querySelectorAll('.fade-in');

const appearOptions = {
  threshold: 0.2,
  rootMargin: "0px 0px -50px 0px"
};

const appearOnScroll = new IntersectionObserver(function(
  entries,
  appearOnScroll
) {
  entries.forEach(entry => {
    if(!entry.isIntersecting){
      return;
    } else {
      entry.target.style.animation = "fadeIn 1s forwards";
      appearOnScroll.unobserve(entry.target);
    }
  });
}, appearOptions);

faders.forEach(fader => {
  appearOnScroll.observe(fader);
});


// Carousel
const track = document.querySelector('.carousel-track');
const prevButton = document.querySelector('.carousel-btn.prev');
const nextButton = document.querySelector('.carousel-btn.next');
const items = Array.from(track.children);
let index = 0;

const updateCarousel = () => {
    const itemWidth = items[0].getBoundingClientRect().width + 20; // item width + margin
    track.style.transform = `translateX(-${index * itemWidth}px)`;
};

// Button events
nextButton.addEventListener('click', () => {
    if(index < items.length - 1) index++;
    updateCarousel();
});

prevButton.addEventListener('click', () => {
    if(index > 0) index--;
    updateCarousel();
});

// Optional: swipe support for mobile
let startX = 0;
let endX = 0;

track.addEventListener('touchstart', (e) => startX = e.touches[0].clientX);
track.addEventListener('touchmove', (e) => endX = e.touches[0].clientX);
track.addEventListener('touchend', () => {
    if(startX - endX > 50 && index < items.length - 1) index++; // swipe left
    if(endX - startX > 50 && index > 0) index--; // swipe right
    updateCarousel();
});


