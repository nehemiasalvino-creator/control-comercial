# Control Comercial

Plataforma web para el control comercial distrital y nacional de YPFB.

## Módulos iniciales

- **MOV Mayoreo:** ventas, transferencias, clasificación de clientes y cumplimiento del PRODE.
- **Estaciones propias:** ventas, recepciones, consumo propio, recaudaciones y depósitos.
- **EXPIRA:** registro y alertas de documentos por estación y responsables.
- **Centro de cargas:** recepción versionada de Excel y CSV por distrito, zona y periodo.

## Inicio local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sin configuración Firebase se habilita temporalmente el acceso demostrativo:

- Usuario: `demo@control.bo`
- Contraseña: `Demo2026`

## Firebase

Copie la configuración de la aplicación web de Firebase en `.env.local`. Active Authentication con correo/contraseña y cree Firestore y Storage. Las credenciales privadas nunca deben subirse al repositorio.
