'use client'

import {CreateInvite} from "@/app/invite/page";
import {useFormState, useFormStatus} from "react-dom";
import {func} from "prop-types";
import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function InviteForm() {
  const [errorMessage, dispatch] = useFormState(CreateInvite, undefined);
  const router = useRouter();

  useEffect(() => {
    if (errorMessage === "") {
      router.refresh();
    }
  }, [errorMessage]);

  return (
    <form action={dispatch}>
      <CreateButton />
      <p className={"error"}>{errorMessage}</p>
    </form>
  )
}

function CreateButton() {
  const {pending} = useFormStatus();

  return (
    <button aria-disabled={pending} className={"btn"} type={"submit"}>Create</button>
  )
}
