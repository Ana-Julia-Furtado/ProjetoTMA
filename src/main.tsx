import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

import React, { useState } from "react";
import AdminRoomManager from "./components/AdminRoomManager.tsx";


const DEV_LOGIN = "teste";
const DEV_RA = "0000";

function app() {
  const [user, setUser] = useState<{ nome: string; ra: string } | null>(null);

  const [login, setLogin] = useState("");
  const [ra, setRa] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({ nome: login, ra });
  };

  const isDev = user?.nome === DEV_LOGIN && user?.ra === DEV_RA;

  if (!user) {
    return (
      <form onSubmit={handleLogin} className="flex flex-col items-center mt-10">
        <input
          type="text"
          placeholder="Login"
          value={login}
          onChange={e => setLogin(e.target.value)}
          className="mb-2 border px-2 py-1"
        />
        <input
          type="text"
          placeholder="RA"
          value={ra}
          onChange={e => setRa(e.target.value)}
          className="mb-2 border px-2 py-1"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Entrar
        </button>
      </form>
    );
  }

  return (
    <div>
      {isDev ? (
        <div>
          <h1>Modo Desenvolvedor</h1>
          {/* Componentes e funcionalidades de desenvolvedor */}
          <AdminRoomManager
            currentUser={user}
            rooms={[]} // TODO: replace with actual rooms data
            deleteRoom={() => {}} // TODO: replace with actual deleteRoom function
          />
        </div>
      ) : (
        <div>
          <h1>Modo Usuário</h1>
          {/* Componentes e funcionalidades de usuário */}
        </div>
      )}
    </div>
  );
}

export default app;

