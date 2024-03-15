'use client'

import {MouseEvent, MutableRefObject, useRef} from "react";
import {useFormState, useFormStatus} from "react-dom";
import UploadFile from "@/lib/upload";

export default function Upload() {
  const [errorMessage, dispatch] = useFormState(UploadFile, undefined);
  const fileInput = useRef() as MutableRefObject<HTMLInputElement>;
  const fileName = useRef() as MutableRefObject<HTMLSpanElement>;
  const downloadName = useRef() as MutableRefObject<HTMLInputElement>;

  const onFileClick = (e: MouseEvent<HTMLLabelElement>) => {
    e.preventDefault();
    fileInput.current.click();
  }

  const onFileChange = () => {
    const file = fileInput.current.files?.[0];
    if (file) {
      fileName.current.textContent = file.name;
      downloadName.current.value = file.name;
    } else {
      fileName.current.textContent = "No file selected.";
    }
  }

  return (
    <form action={dispatch} className={"form"}>
      <div className={"form__items"}>
        <label className={"form__label"} htmlFor={"file"}>Select a file:</label>
        <div className={"form__input"}>
          <label className={"btn btn--primary"} htmlFor={"file"} tabIndex={0} aria-label={"Browse files"}
                 onClick={onFileClick}>Browse</label>
          <span ref={fileName}>No file selected.</span>
          <input style={{display: "none"}} id={"file"} name={"file"} type={"file"} ref={fileInput}
                 onChange={onFileChange} required/>
        </div>

        <label className={"form__label"} htmlFor={"downloadName"}>Download Name:</label>
        <input className={"form__input"} ref={downloadName} id={"downloadName"} name={"downloadName"} type={"text"}
               placeholder={"cat.png"} autoComplete={"off"} required/>

        <label className={"form__label"} htmlFor={"displayName"}>Display Name:</label>
        <input className={"form__input"} id={"displayName"} name={"displayName"} type={"text"} placeholder={"Cute Cat"}
               autoComplete={"off"} required/>

        <label className={"form__label"} htmlFor={"languageSelect"}>Language Select:</label>
        <select className={"form__input form__select"} id={"languageSelect"} name={"languageSelect"}></select>

        <div className={"form__checkbox-wrapper"}>
          <label className={"form__label"} htmlFor={"gif"}>Convert to 560px GIF</label>
          <input className={"form__checkbox"} id={"gif"} name={"gif"} type={"checkbox"}/>
        </div>

        <div className={"form__checkbox-wrapper"}>
          <label className={"form__label"} htmlFor={"index"}>Include in index</label>
          <input className={"form__checkbox"} id={"index"} name={"index"} type={"checkbox"}/>
        </div>

        {errorMessage && <p className={"error"}>{errorMessage}</p>}
      </div>
      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const {pending} = useFormStatus();

  return (
    <button className={"btn"} type={"submit"} aria-disabled={pending}>Upload</button>
  )
}
