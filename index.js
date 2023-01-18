const child_process = require('child_process');
const path = require('path');
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

const fs = require('fs/promises');

const pastePng = async () => {
    let args;
    
    if (isMac) {
        args = [path.join(__dirname, 'bin/pngpaste'), ['-']];
        
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
            const buffers = [];

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
    } else if (isWin) {
        const {PowerShell} = require('node-powershell');

        const ps = new PowerShell({
            executionPolicy: 'Bypass',
            noProfile: true
        });

        let error;
        try {
            await ps.invoke('$img = (Get-Clipboard -Format Image)');
            await ps.invoke('$memoryStream = New-Object System.IO.MemoryStream');
            await ps.invoke('$img.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)');
            await ps.invoke('$base64 = [System.Convert]::ToBase64String($memoryStream.ToArray())');
            const result = await ps.invoke('Write-Output $base64');
            return Buffer.from(result.raw, 'base64');
        } catch (err) {
            error = err;
        } finally {
            await ps.dispose();
            if (error) {
                throw Error('Could not paste image from clipboard');
            }
        }
    } else {
        throw Error('not implemented');
    }
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