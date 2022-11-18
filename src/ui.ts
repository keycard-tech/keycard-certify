import { Ident } from "./ident";
import { SessionInfo } from "./session-info";

const fs = require('fs');

export let cardInfo: SessionInfo;

export namespace UI {
  export const mainContainer = document.getElementById("main-container");
  export const appInfoContainer = document.getElementById("keycard__card-info");
  export const layoutContainer = document.getElementById("cmd-layout-container");

  const btns = document.getElementsByClassName("keycard__cmd-disabled");

  export function saveCardInfo(appInfo: SessionInfo): void {
    cardInfo = appInfo;
  }

  export function addMessageToLog(mess: string): void {
    let logContainer = document.getElementById('keycard-log-container');
    let message = document.createElement("p");
    let date = new Date().toLocaleTimeString();

    if (logContainer) {
      logContainer.appendChild(message);
      message.classList.add("keycard__card-info-container-message-text");
      message.innerHTML = `${date}: ${mess}`;
    }
  }

  export function renderAppInfo(): void {
    let msg = document.getElementById("no-card-detected-msg");
  }

  export function renderCmdScreenLayout(btn: HTMLElement, layoutPath: string, onLoad: () => void): void {
    btn.addEventListener("click", (e) => {
      loadFragment(layoutPath, onLoad);
      e.preventDefault();
    });
  }

  export function renderVerifyPinLayout(layoutPin: string, layoutPuk: string, pinFunc: () => void, pukFunc: () => void): void {
    cardInfo.pinRetry > 0 ? loadFragment(layoutPin, pinFunc) : loadFragment(layoutPuk, pukFunc);
  }

  export function loadFragment(filename: string, onLoad: () => void): void {
    let path = `${__dirname}/../layouts/${filename}`;
    layoutContainer!.innerHTML = "";

    mainContainer?.classList.add("keycard__card-info-container-hidden");
    mainContainer?.classList.remove("keycard__main-container");
    layoutContainer?.classList.remove("keycard__card-info-container-hidden");
    layoutContainer?.classList.add("keycard__pairing-container");

    fs.readFile(path, (_: Error, layout: string) => {
      layoutContainer!.innerHTML = layout;
      onLoad();
    });
  }

  export function unloadFragment(): void {
    let startBtn = document.getElementById("start-btn") as HTMLInputElement;

    layoutContainer!.innerHTML = "";
    layoutContainer?.classList.add("keycard__card-info-container-hidden");
    layoutContainer?.classList.remove("keycard__pairing-container");
    mainContainer?.classList.remove("keycard__card-info-container-hidden");
    mainContainer?.classList.add("keycard__main-container");
    startBtn.setAttribute("disabled", "disabled");
  }

  export function loadErrorFragment(err: Error): void {
    loadFragment('error.html', () => {
      let errorMessage = document.getElementById("error-message");

      errorMessage!.innerHTML = `${err}`;

      document.getElementById("btn-error")?.addEventListener("click", function (e) {
        UI.unloadFragment();
        e.preventDefault();
      });
    });
  }

  export function renderErrorMess(errMessage: string, messField: HTMLElement): void {
    messField.innerHTML = errMessage;
    setTimeout(() => {
      messField.innerHTML = "";
    }, 10000);
  }

  export function renderNoAppInfo(): void {
    let header = document.getElementById("app-info-header");
    header!.innerHTML = "No card connected";
    header!.classList.remove("keycard__app-info-header");
    header!.classList.add("keycard__card-info-container-message");
    document.getElementById("cash-address")!.innerHTML = "";
    document.getElementById("instance-uid")!.innerHTML = "";
    document.getElementById("app-version")!.innerHTML = "";
    document.getElementById("pairing-slots")!.innerHTML = "";
    document.getElementById("pin-retry")!.innerHTML = "";
    document.getElementById("puk-retry")!.innerHTML = "";
    document.getElementById("key-uid")!.innerHTML = "";
    document.getElementById("key-path")!.innerHTML = "";
  }
}
