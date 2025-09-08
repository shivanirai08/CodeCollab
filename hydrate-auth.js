"use client"

import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { hydrateUser } from "@/store/authSlice"

export default function HydrateAuth() {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(hydrateUser())
  }, [dispatch])

  return null
}
