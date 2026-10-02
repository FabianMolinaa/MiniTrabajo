export interface ReglasPassword {
  longitudMinima: boolean;
  tieneMayuscula: boolean;
  tieneMinuscula: boolean;
  tieneNumero: boolean;
}

export interface ResultadoPassword {
  esValida: boolean;
  reglas: ReglasPassword;
}

export function validarPassword(password: string): ResultadoPassword {
  const reglas: ReglasPassword = {
    longitudMinima: password.length >= 8,
    tieneMayuscula: /[A-Z]/.test(password),
    tieneMinuscula: /[a-z]/.test(password),
    tieneNumero: /[0-9]/.test(password),
  };

  const esValida =
    reglas.longitudMinima &&
    reglas.tieneMayuscula &&
    reglas.tieneMinuscula &&
    reglas.tieneNumero;

  return { esValida, reglas };
}