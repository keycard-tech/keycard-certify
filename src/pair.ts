import { ipcRenderer } from "electron";
import { UI } from "./ui";

export namespace Pair {
  export function pair() : void {
    let pairingField = document.getElementById("pairing") as HTMLInputElement;
    let button = document.getElementById("pair-btn");
    let cancelBtn = document.getElementById("pair-cancel-btn");

    button!.addEventListener("click", function (e) {
      ipcRenderer.send("pairing-pass-submitted", pairingField.value);
      UI.unloadFragment();
      e.preventDefault();
    });

    cancelBtn!.addEventListener("click", (e) => {
      ipcRenderer.send("pairing-pass-submitted", null);
      UI.unloadFragment();
      e.preventDefault();
    });
  }
}