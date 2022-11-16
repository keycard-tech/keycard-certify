import { UI, cardInfo } from "./ui";
import { Utils } from "./utils";
import { ipcRenderer } from "electron";

export namespace PUK {
  export function verifyPUK() : void {
    let verifyPUKInputs = document.getElementsByClassName("keycard__verify-puk-el");
    let puk = document.getElementById("verify-puk-inp") as HTMLInputElement;
    let newPIN = document.getElementById("new-pin") as HTMLInputElement;
    let repeatPIN = document.getElementById("repeat-new-pin") as HTMLInputElement;
    let submitBtn = document.getElementById("verify-puk-btn") as HTMLInputElement;
    let cancelBtn = document.getElementById("verify-puk-cancel");
    let pukRetryMess = document.getElementById("puk-retry-form");

    pukRetryMess!.innerHTML = `${cardInfo.pukRetry}`;

    for(let i = 0; i < verifyPUKInputs.length; i++) {
      verifyPUKInputs[i] as HTMLInputElement;
      verifyPUKInputs[i].addEventListener("input", (e) => {
        if(Utils.checkInputNumericValue(puk.value, 12) && Utils.checkInputNumericValue(newPIN.value, 6) && Utils.checkInputNumericValue(repeatPIN.value, 6) && (newPIN.value == repeatPIN.value)) {
          submitBtn.removeAttribute("disabled");
        } else {
          submitBtn.setAttribute("disabled", "disabled");
        }
        e.preventDefault();
      });
    }

    submitBtn?.addEventListener("click", (e) => {
      ipcRenderer.send("verify-puk", puk.value, newPIN.value);
      UI.unloadFragment();
      e.preventDefault();
    });

    cancelBtn?.addEventListener("click", (e) => {
      puk.value = "";
      newPIN.value = "";
      repeatPIN.value = "";
      UI.unloadFragment();
      e.preventDefault;
    });
  }
}