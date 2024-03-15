'use client'

import {register} from "@/lib/authentication";
import {useFormState, useFormStatus} from "react-dom";

export default function Register() {
  const [errorMessage, dispatch] = useFormState(register, undefined)

  return (
    <div>
      <form action={dispatch} className="form">
        <div className="form__items">
          <label className="form__label" htmlFor="username">Username:</label>
          <input className="form__input" type="text" id="username" name="username" required={true}/>

          <label className="form__label" htmlFor="password">Password:</label>
          <input className="form__input" type="password" id="password" name="password" required={true}/>

          <label className="form__label" htmlFor="invite">Invite code:</label>
          <input className="form__input" type="text" id="invite" name="invite" required={true}/>
        </div>
        <div>
          <p className="error">{errorMessage}</p>
        </div>
        <SignUpButton />
      </form>
      <p>Don't have an account? <a className="link" href="/register">Sign up</a></p>
    </div>
  );
}

function SignUpButton() {
  const {pending} = useFormStatus();

  return (
    <button className="btn" aria-disabled={pending} type={"submit"}>Sign up</button>
  )
}
