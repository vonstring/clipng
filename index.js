const child_process = require('child_process');
const path = require('path');
const isMac = process.platform === 'darwin';
const fs = require('fs/promises');

const pastePng = async () => {
    let args;
    
    if (isMac) {
        args = [path.join(__dirname, 'bin/pngpaste'), ['-']]
    } else {
        throw Error('not implemented');
    }
    const child = child_process.execFile(...args, {
        encoding: 'buffer'
    });
    child.on('error', (err) => {
        try {
            child.kill();
        } finally {
            throw err;
        }
    });

    return new Promise((resolve, reject) => {
        let buffers = [];
        
        child.stdout.on('data', (data) => {
            buffers.push(data);
        });
        child.stderr.on('data', (data) => {
            console.log(data.toString());
        });
        child.on('exit', (code) => {
            if (code === 0) {
                resolve(Buffer.concat(buffers));
            } else {
                reject(new Error(`exit code ${code}`));
            }
        });
    });
}

if (require.main === module) {
    (async () => {
        const imgData = await pastePng();
        await fs.writeFile('test.png', imgData);
        console.log(imgData.length);
    })();
}

module.exports = {
    pastePng,
}

exports.default = pastePng;