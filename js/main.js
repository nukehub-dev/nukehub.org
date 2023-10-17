/*TODO  Preload */
var preLoad = document.getElementById("loading");

function PreLoad() {
  preLoad.style.display = "none";
}

/*TODO  Force Scroll top */
if (history.scrollRestoration) {
  history.scrollRestoration = "manual";
} else {
  window.onbeforeunload = function () {
    window.scrollTo(0, 0);
  };
}

/*TODO  Menu */
const navMenu = document.getElementById("nav-menu"),
  navToggle = document.getElementById("nav-toggle"),
  navClose = document.getElementById("nav-close");

/*========== Show ==========*/
if (navToggle) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.add("show_menu");
  });
}

/*========== Close ==========*/
if (navClose) {
  navClose.addEventListener("click", () => {
    navMenu.classList.remove("show_menu");
  });
}

/*========== Remove Menu Mobile ==========*/
const navLink = document.querySelectorAll(".nav_link");

function linkAction() {
  const navMenu = document.getElementById("nav-menu");

  navMenu.classList.remove("show_menu");
}
navLink.forEach((n) => n.addEventListener("click", linkAction));

/*TODO  Scroll Active Link */
const sections = document.querySelectorAll("section[id]");

function scrollActive() {
  const scrollY = window.pageYOffset;

  sections.forEach((current) => {
    const sectionHeight = current.offsetHeight;
    const sectionTop = current.offsetTop - 100;
    sectionId = current.getAttribute("id");

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      document
        .querySelector(".nav_menu a[href*=" + sectionId + "]")
        .classList.add("active-link");
    } else {
      document
        .querySelector(".nav_menu a[href*=" + sectionId + "]")
        .classList.remove("active-link");
    }
  });
}
window.addEventListener("scroll", scrollActive);

/*TODO  Change Background Header */
const nav = document.getElementById("header-bg");
if (window.innerWidth < 768) {
  nav.classList.remove("header_bg");
  nav.classList.add("header_bg-mobile");
} else {
  nav.classList.add("header_bg");
  if (this.scrollY >= 80) nav.classList.add("scroll-header");
  else nav.classList.remove("scroll-header");
}
function scrollHeader() {
  if (window.innerWidth < 768) {
    nav.classList.remove("header_bg");
    nav.classList.add("header_bg-mobile");
  } else {
    nav.classList.add("header_bg");
    if (this.scrollY >= 80) nav.classList.add("scroll-header");
    else nav.classList.remove("scroll-header");
  }
}
window.addEventListener("scroll", scrollHeader);
window.addEventListener("resize", scrollHeader);
/*TODO  Scroll Up */
function scrollTop() {
  const scrollUp = document.getElementById("scroll-up");
  if (this.scrollY >= 560) scrollUp.classList.add("show-scroll");
  else scrollUp.classList.remove("show-scroll");
}
window.addEventListener("scroll", scrollTop);

/*TODO  Change Theme */
const themeButton = document.getElementById("theme-button");
const darkTheme = "dark-theme";
const iconTheme = "uil-sun";

const selectedTheme = localStorage.getItem("selected-theme");
const selectedIcon = localStorage.getItem("selected-icon");

var selectedColor = localStorage.getItem("selected-color");
var redColor = localStorage.getItem("setRedColor");
var greenColor = localStorage.getItem("setGreenColor");
var blueColor = localStorage.getItem("setBlueColor");
var SVGColor = localStorage.getItem("svg-color");
document.querySelector(":root").style.setProperty("--hue-color", selectedColor);
document.querySelector(":root").style.setProperty("--color-svg", SVGColor);

const getCurrentTheme = () =>
  document.body.classList.contains(darkTheme) ? "dark" : "light";
const getCurrentIcon = () =>
  themeButton.classList.contains(iconTheme) ? "uil-moon" : "uil-sun";

if (selectedTheme) {
  document.body.classList[selectedTheme === "dark" ? "add" : "remove"](
    darkTheme
  );
  themeButton.classList[selectedIcon === "uil-moon" ? "add" : "remove"](
    iconTheme
  );
}

themeButton.addEventListener("click", () => {
  document.body.classList.toggle(darkTheme);
  themeButton.classList.toggle(iconTheme);
  localStorage.setItem("selected-theme", getCurrentTheme());
  localStorage.setItem("selected-icon", getCurrentIcon());
});

document.querySelectorAll(".theme-colors .color").forEach((color) => {
  console.log("clicked");
  color.onclick = () => {
    var colorName = color.getAttribute("name");
    var background = color.getAttribute("hue-color");
    var redColor = color.getAttribute("red");
    var greenColor = color.getAttribute("green");
    var blueColor = color.getAttribute("blue");
    var particleColor = color.getAttribute("particle-color");
    var SVGColor = color.getAttribute("svg-color");
    localStorage.setItem("selected-color", background);
    localStorage.setItem("particle-color", particleColor);
    localStorage.setItem("setRedColor", redColor);
    localStorage.setItem("setGreenColor", greenColor);
    localStorage.setItem("setBlueColor", blueColor);
    localStorage.setItem("svg-color", SVGColor);
    document
      .querySelector(":root")
      .style.setProperty("--hue-color", background);
    document.querySelector(":root").style.setProperty("--color-svg", SVGColor);
    particleColor = particleColor.split(",");
    $("particles-js").html("");
    runParticleJS(particleColor);
  };
});

/*TODO  Scroll Reveal */

const sr = ScrollReveal({
  distance: "50px",
  duration: 2000,
  delay: 0,
  reset: false,
});
if (window.innerWidth > 768) {
  sr.reveal(`.nav_item, .change-theme`, {
    interval: 100,
    distance: "20px",
  });
}
sr.reveal(`.nav_logo`, {
  origin: "left",
  interval: 50,
});
sr.reveal(`.section_title, .section_subtitle`, {
  interval: 50,
});

sr.reveal(`.home_img`, {
  origin: "right",
  distance: "100px",
});
sr.reveal(`.home_title, .home_subtitle, .home_description`, {
  origin: "top",
  delay: 400,
  interval: 200,
});
sr.reveal(`.home_button,.home_social-icon`, {
  delay: 700,
  origin: "left",
  interval: 200,
  distance: "100px",
});
sr.reveal(`.home_scroll`, {
  delay: 2000,
});
sr.reveal(`.about_img`, {
  origin: "left",
  delay: 100,
});
sr.reveal(`.about_description,.about_info,.about_buttons`, {
  origin: "right",
  interval: 50,
});
sr.reveal(`.project_bg`, {
  distance: "100px",
});
sr.reveal(`.project_title`, {
  origin: "top",
});
sr.reveal(`.project_description`, {
  interval: 50,
});
sr.reveal(`.project_img-reveal`, {
  origin: "right",
});
sr.reveal(`.join_information`, {
  interval: 50,
  origin: "left",
});
sr.reveal(`.join_content,.join_button`, {
  interval: 50,
  origin: "right",
});
sr.reveal(
  `.footer_bg,.footer_title,.footer_subtitle,.footer_copy`,
  {
    interval: 50,
  }
);
/*TODO  Context Menu */
$(function () {
  $.contextMenu({
    selector: "main",
    callback: function (key, options) {
      var m = "clicked: " + key;
    },
    animation: {
      duration: 200,
      show: "fadeIn",
      hide: "fadeOut",
    },
    zIndex: 10000,
    items: {
      firstCommand: {
        name: "<i class='uil uil-estate context_menu-icon'></i> Home",
        isHtmlName: true,
        callback: function (key, opt) {
          window.location.href = "#home";
        },
      },
      secondCommand: {
        name: "<i class='uil uil-file-alt context_menu-icon'></i> Projects",
        isHtmlName: true,
        callback: function (key, opt) {
          window.location.href = "#projects";
        },
      },
      thirdCommand: {
        name: "<i class='uil uil-comment-plus context_menu-icon'></i> join",
        isHtmlName: true,
        callback: function (key, opt) {
          window.location.href = "#join";
        },
      },
    },
  });
});
/*TODO  Notification */
let globalOptions = {
  position: "top-right",
  maxNotifications: 5,
  animationDuration: 200,
  durations: {
    global: 5000,
  },
  icons: {
    enabled: true,
    prefix: "<i class='uil ",
    suffix: "'></i>",
    warNukeHubg: "uil-exclamation-triangle",
    success: "uil-check-circle",
    error: "uil-times-circle",
  },
};
let notifier = new AWN(globalOptions);

/*TODO  particlesJS */
const particleActive = document.querySelector(".ParticlesJS");
var particleLineColor;
var particleColor;
try {
  particleColor = localStorage.getItem("particle-color").split(",");
} catch (err) {
  particleColor = ["#e06257", "#cb4e43", "#fcbbb6"];
}

themeButton.addEventListener("click", () => {
  $("particles-js").html("");
  particleColor = localStorage.getItem("particle-color").split(",");
  runParticleJS(particleColor);
});

function runParticleJS(particleColor) {
  if (document.body.className === darkTheme) {
    particleLineColor = "#ffffff";
  } else {
    particleLineColor = "#000000";
  }
  particlesJS("particles-js", {
    particles: {
      number: { value: 10, density: { enable: true, value_area: 1500 } },
      color: { value: particleColor }, //FIXME: Not updateing after change color need page reflesh
      shape: {
        type: "circle",
        stroke: { width: 0, color: "#000000" },
        polygon: { nb_sides: 12 },
        image: { src: "assests/images/nrms.svg", width: 100, height: 100 },
      },
      opacity: {
        value: 0.03,
        random: false,
        anim: { enable: false, speed: 0.05, opacity_min: 0.01, sync: true },
      },
      size: {
        value: 500,
        random: true,
        anim: { enable: true, speed: 5, size_min: 0.1, sync: true },
      },
      line_linked: {
        enable: true,
        distance: 500,
        color: particleLineColor,
        opacity: 0.4,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.2,
        direction: "none",
        random: true,
        straight: false,
        out_mode: "bounce",
        bounce: false,
        attract: { enable: true, rotateX: 600, rotateY: 1200 },
      },
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: { enable: false, mode: "repulse" },
        onclick: { enable: true, mode: "repulse" },
        resize: true,
      },
      modes: {
        grab: { distance: 400, line_linked: { opacity: 1 } },
        bubble: {
          distance: 400,
          size: 40,
          duration: 2,
          opacity: 8,
          speed: 3,
        },
        repulse: { distance: 300, duration: 0.4 },
        push: { particles_nb: 4 },
        remove: { particles_nb: 2 },
      },
    },
    retina_detect: true,
  });
}
runParticleJS(particleColor);
