'use client'

import {authenticate} from "@/lib/authentication";
import {useFormState, useFormStatus} from "react-dom";

export default function Login() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined)

  return (
    <div>
      <form action={dispatch} className="form">
        <div className="form__items">
          <label className="form__label" htmlFor="username">Username:</label>
          <input className="form__input" type="text" id="username" name="username" required={true}/>

          <label className="form__label" htmlFor="password">Password:</label>
          <input className="form__input" type="password" id="password" name="password" required={true}/>
        </div>
        <div>
          <p className="error">{errorMessage}</p>
        </div>
        <LoginButton />
      </form>

      <p>Don't have an account? <a className="link" href="/register">Sign up</a></p>
    </div>
  )
}

function LoginButton() {
  const {pending} = useFormStatus();

  return (
    <button className="btn" aria-disabled={pending} type={"submit"}>Sign in</button>
  )
}
