import { UI } from "./ui";
import { Pair } from "./pair";
import { PUK } from "./puk";
import { PIN } from "./pin";
import { Ident } from "./ident";

const { ipcRenderer } = require('electron');
let defaultPass = true;

export function updateLogMessage(event: string, msg: string): void {
  ipcRenderer.on(event, (_) => {
    UI.addMessageToLog(msg);
  });
}

ipcRenderer.on("card-removed", (_, readerName) => {
  UI.unloadFragment();
  UI.addMessageToLog(`Card has been removed from ${readerName}`);
});

ipcRenderer.on('reader-removed', (_, readerName) => {
  UI.unloadFragment();
  UI.addMessageToLog(`Reader ${readerName} removed`);
});

ipcRenderer.on('card-detected', (_, readerName, err?) => {
  err ? UI.addMessageToLog(`Error ${readerName}: ${err}`) : UI.addMessageToLog(`New reader ${readerName} detected`);
});

ipcRenderer.on("card-connection-err", (_, err) => {
  UI.addMessageToLog(`Error connecting to the card: ${err}`);
});

ipcRenderer.on("application-info", function (_, sessionInfo) {
  UI.saveCardInfo(sessionInfo);
});

ipcRenderer.on("card-exceptions", function (_, err) {
  UI.loadErrorFragment(err);
});

ipcRenderer.on("pin-screen-needed", (_) => {
  UI.loadFragment('verify-pin.html', PIN.verifyPIN);
});

ipcRenderer.on("puk-screen-needed", (_) => {
  UI.loadFragment('verify-puk.html', PUK.verifyPUK);
});

ipcRenderer.on("pin-verified", (_) => {
  UI.addMessageToLog("PIN verified");
});

ipcRenderer.on('pin-verification-failed', (_, msg) => {
  UI.addMessageToLog(msg);
});

ipcRenderer.on("certificate-creation-success", (_) => {
  UI.unloadFragment();
  UI.addMessageToLog("Certificate generation finished");
  UI.unloadFragment();
});

ipcRenderer.on("pub-key", (_, key) => {
  UI.addMessageToLog(`CA public key: ${key}`);
});

ipcRenderer.on("pairing-needed", (_, defpair: boolean) => {
  UI.addMessageToLog("No pairing found");
  if (defaultPass) {
    defaultPass = false;
    ipcRenderer.send("pairing-pass-submitted", "KeycardDefaultPairing");
  } else {
    UI.loadFragment('pairing.html', Pair.pair);
  }
});

ipcRenderer.on("secure-channel-opened", (_) => {
  UI.renderVerifyPinLayout('verify-pin.html', 'verify-puk.html', PIN.verifyPIN, PUK.verifyPUK);
});

ipcRenderer.on("destination-path-selected", (_, path) => {
  Ident.setDestinationPath(path);
});

updateLogMessage('card-connected', "Selecting Keycard Wallet");
updateLogMessage('pairing-found', "Pairing found");
updateLogMessage('secure-channel', "Secure Channel opened");
updateLogMessage('paired', "Paired successfully");
updateLogMessage('puk-verified', "PIN unblocked successfully");
updateLogMessage('unblock-pin-failed', "PUK tries exceeded. The card has been blocked. Please re-install the applet.");

document.getElementById("start-btn")?.addEventListener("click", (e) => {
  ipcRenderer.send("open-secure-channel");
  e.preventDefault();
});

Ident.initUI();


