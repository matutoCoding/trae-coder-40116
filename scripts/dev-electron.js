const { spawn, execSync } = require('child_process')
const path = require('path')

const isWin = process.platform === 'win32'
const env = { ...process.env, ELECTRON: 'true' }
const mode = process.argv[2]

if (mode === 'build') {
  try {
    execSync('npx vite build', {
      cwd: path.resolve(__dirname, '..'),
      env,
      stdio: 'inherit'
    })
    console.log('\n✅ Web + Electron 主进程构建完成\n')
    console.log('📦 正在打包桌面客户端...\n')
    execSync('npx electron-builder', {
      cwd: path.resolve(__dirname, '..'),
      env,
      stdio: 'inherit'
    })
    console.log('\n✅ 桌面客户端打包完成！产物在 release/ 目录')
  } catch (e) {
    process.exit(1)
  }
} else {
  const shell = isWin ? 'cmd' : 'sh'
  const shellArgs = isWin ? ['/c'] : ['-c']
  const child = spawn(shell, [...shellArgs, 'npx vite'], {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: 'inherit'
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}
