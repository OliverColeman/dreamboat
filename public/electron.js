// Based on https://mmazzarolo.com/blog/2021-08-12-building-an-electron-application-using-create-react-app/

// Module to control the application lifecycle and the native browser window.
const { app, BrowserWindow, protocol } = require('electron')
const path = require('path')
const url = require('url')

/** Values of an environment variable that are taken to mean "on"; anything else means "off".
 * The same list as `envTruthyValues` in src/settings.ts.
 */
const envTruthyValues = ['true', '1', 'yes', 'on']

/** Whether the application drives simulated hardware instead of the vehicle. The renderer decides
 * this from the same variable, which Create React App inlines when the application is started or
 * built; the main process reads it from the environment at run time, so `sim.sh` exports it for the
 * whole process tree.
 */
const simulationMode = envTruthyValues.includes(
  (process.env.REACT_APP_SIMULATION_MODE ?? '').trim().toLowerCase()
)

/** Address of the Create React App development server, when the application is being run from it.
 * `run.sh` runs the built bundle and leaves this unset; `rundev.sh` and `sim.sh` go by way of
 * `npm run electron:start`, which sets it.
 */
const devServerURL = process.env.ELECTRON_DEV_SERVER_URL

/** Size of the display in the hand-held controller, in pixels. */
const controllerDisplaySize = { width: 1024, height: 600 }

// Create the native browser window.
function createWindow () {
  const mainWindow = new BrowserWindow({
    // On the vehicle the application occupies the whole of the hand-held controller's display. In
    // simulation it runs on an ordinary desktop, so it takes a centred window whose content area is
    // the size of that display, giving the same layout as the controller shows.
    ...(simulationMode ? { center: true } : { x: 0, y: 0 }),
    width: controllerDisplaySize.width,
    height: controllerDisplaySize.height,
    useContentSize: true,
    autoHideMenuBar: true,
    fullscreen: !simulationMode,
    // Set the path of an additional "preload" script that can be used to
    // communicate between node-land and browser-land.
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
    },
  })

  // The window is loaded from the development server when one is being used, and otherwise from the
  // bundle sitting next to this file, which is what `npm run build` produces. `app.isPackaged` does
  // not distinguish the two, because a built bundle run directly is not a packaged application.
  const appURL = devServerURL || url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true,
  })
  mainWindow.loadURL(appURL)

  // Automatically open Chrome's DevTools in development mode.
  // if (!app.isPackaged) {
  //   const devtools = new BrowserWindow()
  //   mainWindow.webContents.setDevToolsWebContents(devtools.webContents)
  //   mainWindow.webContents.openDevTools({ mode: 'detach' })
  //   mainWindow.webContents.once('did-finish-load', function () {
  //     const windowBounds = mainWindow.getBounds()
  //     devtools.setPosition(windowBounds.x + windowBounds.width, windowBounds.y)
  //     devtools.setSize(windowBounds.width / 2, windowBounds.height)
  //   })
  // }
}

// Setup a local proxy to adjust the paths of requested files when loading
// them from the local production bundle (e.g.: local fonts, etc...).
function setupLocalFilesNormalizerProxy () {
  protocol.registerHttpProtocol(
    'file',
    (request, callback) => {
      const url = request.url.substr(8)
      callback({ path: path.normalize(`${__dirname}/${url}`) })
    },
    (error) => {
      if (error) console.error('Failed to register protocol')
    }
  )
}

// This method will be called when Electron has finished its initialization and
// is ready to create the browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  setupLocalFilesNormalizerProxy()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS.
// There, it's common for applications and their menu bar to stay active until
// the user quits  explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// If your app has no need to navigate or only needs to navigate to known pages,
// it is a good idea to limit navigation outright to that known scope,
// disallowing any other kinds of navigation.
const allowedNavigationDestinations = 'https://my-electron-app.com'
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    if (!allowedNavigationDestinations.includes(parsedUrl.origin)) {
      event.preventDefault()
    }
  })
})

app.allowRendererProcessReuse = false

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
