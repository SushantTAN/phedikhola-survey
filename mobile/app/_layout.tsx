import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { initDb } from "@/src/db";
export default function RootLayout(){const[client]=useState(()=>new QueryClient());useEffect(()=>{void initDb();},[]);return <QueryClientProvider client={client}><Stack screenOptions={{headerShown:false}}/></QueryClientProvider>}
