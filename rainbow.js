// https://gist.github.com/markdurrant/d8585d7c874e355140548618a1ea255d
// Add rainbow outlines to all elements for debugging CSS.
// Use Alt + Shit + R to turn on or off.

let rainbow = function () {
  if (!document.getElementById('rainbow')) {
    console.log('🌈: ON')

    let rainbowContent = document.createTextNode(
      '* { outline: 1px solid rgba(255, 127, 0, 0.75); } *:nth-child(2n) { outline: 1px solid rgba(255, 127, 0, 0.75); } *:nth-child(3n) { outline: 1px solid rgba(255, 255, 0, 0.75); } *:nth-child(4n) { outline: 1px solid rgba(0, 255, 0, 0.75); } *:nth-child(5n) { outline: 1px solid rgba(0, 0, 255, 0.75); } *:nth-child(6n) { outline: 1px solid rgba(75, 0, 130, 0.75); } *:nth-child(7n) { outline: 1px solid rgba(148, 0, 211, 0.75); }',
    )

    let rainbowElm = document.createElement('style')
    rainbowElm.appendChild(rainbowContent)
    rainbowElm.setAttribute('id', 'rainbow')

    document.getElementsByTagName('head')[0].appendChild(rainbowElm)
  } else {
    console.log('🌈: OFF')

    document.getElementById('rainbow').outerHTML = ''
  }
}

document.onkeydown = function (e) {
  if (e.altKey && e.shiftKey && e.code === 'KeyR') {
    rainbow()
  }
}

// rainbow()
