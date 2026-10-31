import React, { useContext, useState, useEffect } from 'react';
import { NumerosContext } from '../context/NumerosContext';


const FormularioEditar = ({ handleCancelarEdicion, numero }) => {
    
  
    const { actualizarNumero } = useContext(NumerosContext);
    
  
    const [producto, setProducto] = useState(numero);

    
    useEffect(() => {
        setProducto(numero);
    }, [numero]);


    const handleSubmit = (e) => {
        e.preventDefault();
        
        
        actualizarNumero(producto);
        
       
        handleCancelarEdicion();
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
       
        let newValue = value;
        if (name === 'Contesta') {
             
             newValue = value === 'true'; 
        }

        setProducto({
            ...producto,
            ultimaFecha : new Date().toISOString(),
            [name]: newValue,
        });
      
    };

    return (
        <div className="card mt-4 p-3">
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label" htmlFor="numero">
                        
                    Número:</label>
                    <input 
                        type="text" 
                        name="numero" 
                        value={producto.numero || ''} 
                        onChange={handleChange} 
                        className="form-control"
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Contesta:</label>
                    <select 
                        name="contesta" 
                        id="contesta" 
                        className="form-control" 
                        
                        value={producto.contesta} 
                        onChange={handleChange}
                    >
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                </div>
                <button type="submit" className="btn btn-primary me-2">Guardar Cambios</button>
                <button type="button" className="btn btn-secondary" onClick={handleCancelarEdicion}>Cancelar</button>
            </form>
        </div>
    );
}

export default FormularioEditar;
