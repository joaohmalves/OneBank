import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'; 
import { AuthProvider, useAuth } from './contexts/AuthContext'; 
import { BankingProvider } from './contexts/BankingContext'; 
import { CognigyProvider } from './contexts/CognigyContext'; 
import { AppShell } from './components/layout/AppShell'; 
import { DemoPanel } from './components/cognigy/DemoPanel'; 
import { Login } from './pages/Login'; 
import { Dashboard } from './pages/Dashboard'; 
import { Cards } from './pages/Cards'; 
import { Statement } from './pages/Statement'; 
import { createCognigyClient } from './services/cognigy/createCognigyClient';

const cognigyClient=createCognigyClient();
const useRealWidget=import.meta.env.VITE_COGNIGY_ENABLED==='true';
function Protected(){const {authenticated}=useAuth();return authenticated?<BankingProvider><CognigyProvider client={cognigyClient}><AppShell/>{!useRealWidget&&<DemoPanel/>}</CognigyProvider></BankingProvider>:<Navigate to="/" replace/>}
export default function App(){return <AuthProvider><BrowserRouter><Routes><Route path="/" element={<Login/>}/><Route element={<Protected/>}><Route path="/dashboard" element={<Dashboard/>}/><Route path="/cartoes" element={<Cards/>}/><Route path="/extrato" element={<Statement/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter></AuthProvider>}
