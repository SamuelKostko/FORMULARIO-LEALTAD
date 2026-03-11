let firebaseConfigPromise;

const emptyFirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

export async function getFirebaseConfig() {
  if (!firebaseConfigPromise) {
    firebaseConfigPromise = fetch("/api/firebase-config", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar la configuración de Firebase.");
        }

        const payload = await response.json();

        return {
          apiKey: payload.apiKey ?? "",
          authDomain: payload.authDomain ?? "",
          projectId: payload.projectId ?? "",
          storageBucket: payload.storageBucket ?? "",
          messagingSenderId: payload.messagingSenderId ?? "",
          appId: payload.appId ?? "",
        };
      })
      .catch(() => emptyFirebaseConfig);
  }

  return firebaseConfigPromise;
}

export const firebaseCollection = "formularios_lealtad";
