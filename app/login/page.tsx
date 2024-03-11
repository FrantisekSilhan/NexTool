'use server'

export default async function Login() {
  async function checkLogin(formData: FormData) {
    'use server'
    console.log(formData);
  }

  return (
    <form action={checkLogin} className="form">
      <div className="form__items">
        <label className="form__label" htmlFor="username">Username:</label>
        <input className="form__input" type="text" id="username" name="username" required={true}/>

        <label className="form__label" htmlFor="password">Password:</label>
        <input className="form__input" type="password" id="password" name="password" required={true}/>
      </div>

      <button className="btn" type="submit">Sign in</button>
    </form>
  )
}
