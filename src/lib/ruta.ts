/** Dirección de un archivo de la carpeta public, respetando la subcarpeta donde está publicada la app. */
export const recurso = (archivo: string) => `${import.meta.env.BASE_URL}${archivo}`
