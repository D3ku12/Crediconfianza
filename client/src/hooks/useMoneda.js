export function useMoneda() {
  const formatear = (valor) => {
    const num = valor.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const limpiar = (valorFormateado) => {
    return parseFloat(valorFormateado.replace(/\./g, '')) || 0;
  };

  return { formatear, limpiar };
}
