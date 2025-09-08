"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation" 


export default function DashboardPage() {
  const router = useRouter()
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("users").select("*")
      console.log(data)
    }
    fetchData()
  }, [])

  return (<>
  <h1>Dashboard</h1>
  <p>Welcome to your dashboard!</p>
  <Button onClick = {() => {supabase.auth.signOut(); Cookies.remove("sb-access-token"); router.push("/")}}>Logout</Button>
  </>)
}