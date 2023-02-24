const currentTime = document.getElementById("current-time")
const timerDot = document.getElementById('time-dot')
const minute = document.getElementById('minute')
const second = document.getElementById('second')
const closeModel = document.getElementById('close')
const timeContainer = document.querySelector('.time-container')
const timerStatus = document.querySelector('.status')
const modelOverlay = document.querySelector('.overlays')
const settingBtn = document.querySelector('.settings')
const settingControl = document.querySelector('.apply-setting')
const pomodoroInput = document.getElementById('pomodoro')
const shortBreakInput = document.getElementById('short-break')
const longBreakInput = document.getElementById('long-break')
const fonts = document.querySelectorAll(".font")
const colors = document.querySelectorAll(".color")
const timeSlots = document.querySelectorAll(".btn")

//get theme and font from local storage
const getStorageTheme = () => {
    let theme = "theme1"
    if (localStorage.getItem("theme")) {
        theme = localStorage.getItem("theme")
        return theme
    }
    return theme
}

const getStorageFont = () => {
    let font = "Poppins"
    if (localStorage.getItem("font")) {
        font = localStorage.getItem("font")
        return font
    }
    return font
}

//getting initial font and color
colors.forEach(color => {
    if (color.id === getStorageTheme()) {
        color.innerHTML = "&check;"
    }
})
fonts.forEach(font => {
    if (font.style.fontFamily === getStorageFont()) {
        font.classList.add("font-active")
    }
})

//time variables
let setPomodoro = 25
let shortBreak = 5
let longBreak = 15

settingControl.addEventListener("click", () => {
    modelOverlay.style.display = "none"
})

const handleInputChange = (e, type) => {
    if (type === "pomodoro")
        setPomodoro = +e.target.value
    if (type === "short-break")
        shortBreak = +e.target.value
    if (type === "long-break")
        longBreak = +e.target.value

    console.log(setPomodoro, shortBreak, longBreak)
}
// changing setting based on the input
pomodoroInput.addEventListener("change", (e) => handleInputChange(e, "pomodoro"))
shortBreakInput.addEventListener("change", (e) => handleInputChange(e, "short-break"))
longBreakInput.addEventListener("change", (e) => handleInputChange(e, "long-break"))

let m = setPomodoro
const totalSec = setPomodoro * 60
let s = 0
let secondsNow = m * 60
let isTimerOn = true

// opent settings layout when clicked on settings button
settingBtn.addEventListener("click", () => {
    modelOverlay.style.display = "flex"
})

// close model on close button press
closeModel.addEventListener("click", () => {
    modelOverlay.style.display = "none"
})

//countdown logic
function countdown() {
    let minutes = (m < 10) ? `0${m}` : m
    let seconds = (s < 10) ? `0${s}` : s

    minute.innerHTML = minutes
    second.innerHTML = seconds

    if (s === 0) {
        s = 60
        m--
    }

    if (m < 0) {
        timerDot.style.display = 'none'
        currentTime.style.strokeDashoffset = 880
        clearInterval(timer)
    }
    s--
    secondsNow--
    // animating svg stroke to match the current time position
    if (currentTime.style.strokeDashoffset < 880)
        currentTime.style.strokeDashoffset = 880 - (880 * (secondsNow)) / (totalSec)
    // rotating dot according to the no of sections
    timerDot.style.transform = `rotate(${(360 / setPomodoro) * (secondsNow / 60)}deg)`
}

//initializing countdown
let timer = setInterval(countdown, 1000)
//function to stop toggle the timer
const stopPomodoro = (isOn) => {
    if (isOn) {
        clearInterval(timer)
        timerStatus.innerHTML = "START"
    } else {
        timerStatus.innerHTML = "PAUSE"
        setTimeout(() => {
            clearInterval(timer)
            timer = setInterval(countdown, 1000)
        }, 1000)
    }
    isTimerOn = !isOn
}

timeContainer.addEventListener("click", () => stopPomodoro(isTimerOn))
// changing font and theme of the page
fonts.forEach((font, index) => {
    font.addEventListener("click", () => {
        document.documentElement.style.setProperty("--font-face", font.style.fontFamily)
        localStorage.setItem("font", font.style.fontFamily)
        fonts.forEach(font => font.classList.remove("font-active"))
        font.classList.add("font-active")
    })
})

colors.forEach((color, index) => {
    color.addEventListener("click", () => {
        document.documentElement.className = color.id
        localStorage.setItem("theme", color.id)
        colors.forEach(color => color.innerHTML = "")
        color.innerHTML = "&check;"
    })
})

document.documentElement.className = getStorageTheme()
document.documentElement.style.setProperty("--font-face", getStorageFont())
