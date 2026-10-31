import React, { useState, useContext } from "react";
import { NumerosContext } from "../context/NumerosContext";

function FormularioAgregar() {
  const { agregarNumero, numeros } = useContext(NumerosContext);
  
  const [producto, setProducto] = useState({
    direccion: "",
    contesta: false, 
    ultimaFecha: "",
    territorio: "",
    edificio: "",
    numero: "",
    reservado: false
  });

  const getNextEdificio = (terr) => {
    if (!terr || !numeros || numeros.length === 0) return "";
    const edificiosDelTerritorio = numeros
      .filter((n) => String(n.territorio) === String(terr) && n.edificio)
      .map((n) => String(n.edificio).trim().toUpperCase());
    
    if (edificiosDelTerritorio.length === 0) return "A";
    
    const maxEdificio = edificiosDelTerritorio.sort().reverse()[0];
    const nextCharCode = maxEdificio.charCodeAt(0) + 1;
    if (nextCharCode > 90) return "A"; 
    return String.fromCharCode(nextCharCode);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "contesta") {
      finalValue = value === "true";
    }

    setProducto({ ...producto, [name]: finalValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fechaFormateada = `${producto.ultimaFecha}T00:00:00`;

    const datosParaEnviar = {
      ...producto,
      contesta: Boolean(producto.contesta),
      reservado: false,
      ultUsuario: null,
      reservadoA: null,
      tocar: true,
      ultimaFecha: fechaFormateada
    };

    await agregarNumero(datosParaEnviar);

    setProducto({
      direccion: "", contesta: false, ultimaFecha: "",
      territorio: "", edificio: "", numero: "", reservado: false
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
      <div className="mb-3">
        <label className="form-label">Dirección:</label>
        <input type="text" name="direccion" className="form-control" 
               value={producto.direccion} onChange={handleChange} required />
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Número:</label>
          <input type="text" name="numero" className="form-control" 
                 value={producto.numero} onChange={handleChange} required />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Contesta:</label>
          <select name="contesta" className="form-select" 
                  value={producto.contesta} onChange={handleChange}>
            <option value="false">No (false)</option>
            <option value="true">Sí (true)</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Último Llamado:</label>
        <input type="date" name="ultimaFecha" className="form-control" 
               value={producto.ultimaFecha} onChange={handleChange} required />
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Territorio (Número):</label>
          <input type="number" name="territorio" className="form-control" 
                 value={producto.territorio} onChange={handleChange} />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Edificio:</label>
          <div className="input-group">
            <input type="text" name="edificio" className="form-control" 
                   value={producto.edificio} onChange={handleChange} />
            {producto.territorio && getNextEdificio(producto.territorio) && (
              <button 
                type="button" 
                className="btn btn-outline-secondary" 
                onClick={() => setProducto({...producto, edificio: getNextEdificio(producto.territorio)})}
                title="Sugerir siguiente edificio"
              >
                Sugerir: {getNextEdificio(producto.territorio)}
              </button>
            )}
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Reservado:</label>
          <select name="reservado" className="form-select" 
                  value={producto.reservado} onChange={handleChange}>
            <option value="false">No (false)</option>
            <option value="true">Sí (true)</option>
          </select>
        </div>
      </div>

      <button type="submit" className="btn btn-success w-100">Agregar a Base de Datos</button>
    </form>
  );
}

export default FormularioAgregar;
