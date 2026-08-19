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

## Publicación gratuita

```bash
npm run build
firebase deploy --only hosting
```

Firebase Hosting publica el contenido generado en `out/`.

## Firebase

Proyecto conectado: `control-comercial-8171e`. Active Authentication con correo/contraseña y cree Firestore y Storage. La configuración web pública se encuentra en `lib/firebase-config.ts`; las credenciales privadas nunca deben subirse al repositorio.

El acceso consulta el perfil `users/{uid}` en Firestore. Los roles admitidos son
`super_admin`, `district_uploader`, `district_viewer` y `national_viewer`.

La aplicación se exporta como sitio estático para Firebase Hosting en el plan
Spark. El superadministrador crea la cuenta de Authentication y luego autoriza su
perfil en Firestore; una cuenta sin perfil activo no puede entrar ni leer datos.
