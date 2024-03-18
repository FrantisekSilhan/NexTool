'use client'

import {useFormState, useFormStatus} from "react-dom";
import Shorten from "@/lib/shortener";
import {useState} from "react";
import {log} from "node:util";

export default function ShortenerForm() {
  const [errorMessage, dispatch] = useFormState(Shorten, undefined);
  const [customURL, setCustomURL] = useState(true);
  const [useVisits, setUseVisits] = useState(true);

  return (
    <>
      <form className={"form"}>
        <div className="form__items">
          <label className="form__label" htmlFor="url">URL:</label>
          <div id="urlLenWrapper">
            <input className="form__input" type="url" id="url" name="url" autoComplete="off" required/>
            <span id="urlLen"></span>
          </div>

          <label className="form__label" htmlFor="customUrl">Custom URL:</label>
          <input className="form__input" type="text" id="customUrl" name="customUrl" autoComplete="off" disabled={customURL}/>
          <div className="form__checkbox-wrapper">
            <label className="form__label" htmlFor="useCustomUrl">Use Custom URL</label>
            <input className="form__checkbox" type="checkbox" id="useCustomUrl" name="useCustomUrl" onChange={() => setCustomURL(prev => !prev)}/>
          </div>

          <label className="form__label" htmlFor="visits">Custom URL:</label>
          <div className="form__input-number-wrapper">
            <input className="form__input" type="number" id="visits" name="visits" autoComplete="off" disabled={useVisits}/>
            <div id="numberUp" className="form__input-number form__input-number-up"></div>
            <div id="numberDown" className="form__input-number form__input-number-down"></div>
          </div>
          <div className="form__checkbox-wrapper">
            <label className="form__label" htmlFor="useVisits">Remove after N visits</label>
            <input className="form__checkbox" type="checkbox" id="useVisits" name="useVisits" onChange={() => setUseVisits(prev => !prev)}/>
          </div>
        </div>

        {errorMessage && <p className={"error"}>{errorMessage}</p>}
        <ShortenButton />
      </form>
    </>
  )
}

function ShortenButton() {
  const {pending} = useFormStatus();

  return (
    <button className={"btn"} type={"submit"} disabled={pending}>Shorten</button>
  )
}
