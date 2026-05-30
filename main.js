// const robot = require('robotjs');

// const keys = [
//     'capslock',
//     'control',
//     'shift',
//     'alt'
// ];

// console.log('Running...');

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// (async () => {
//     try {
//         while (true) {
//             const waitTime = (120 + Math.random()) * 1000; // 120-121 seconds
//             await sleep(waitTime);

//             const key = keys[Math.floor(Math.random() * keys.length)];
//             robot.keyTap(key);

//             console.log(`Pressed: ${key}`);
//         }
//     } catch (err) {
//         console.error(err);
//     }
// })();

const { keyboard, Key } = require('@nut-tree-fork/nut-js');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    while (true) {
        await sleep(60000);

        const keys = [Key.LeftControl, Key.LeftShift];
        const key = keys[Math.floor(Math.random() * keys.length)];

        await keyboard.pressKey(key);
        await keyboard.releaseKey(key);

        console.log('.');
    }
})();