
(function(){
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const statusBox = document.getElementById('form-status');

  const fields = {
    nombre: document.getElementById('nombre'),
    email: document.getElementById('email'),
    telefono: document.getElementById('telefono'),
    mensaje: document.getElementById('mensaje'),
    acepto: document.getElementById('acepto')
  };

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const phoneDigitsRegex = /\d/g; 
  const phoneAllowedChars = /^[+()\d\s-\.]+$/;

  function setError(field, message){
    const errorEl = document.getElementById('error-' + field);
    const input = fields[field];
    if(message){
      errorEl.textContent = message;
      input.classList.add('input-error');
      errorEl.setAttribute('aria-hidden','false');
    } else {
      errorEl.textContent = '';
      input.classList.remove('input-error');
      errorEl.setAttribute('aria-hidden','true');
    }
  }

  function validateNombre(){
    const val = fields.nombre.value.trim();
    if(!val) return 'El nombre es obligatorio.';
    if(val.length < 3) return 'Pon tu nombre completo o al menos 3 letras.';
    return '';
  }

  function validateEmail(){
    const val = fields.email.value.trim();
    if(!val) return 'El correo electrónico es obligatorio.';
    if(!emailRegex.test(val)) return 'Formato de correo inválido. Ej: tunombre@ejemplo.com';
    return '';
  }

  function validateTelefono(){
    const val = fields.telefono.value.trim();
    if(!val) return 'El teléfono es obligatorio.';
    if(!phoneAllowedChars.test(val)) return 'Caracteres inválidos en el teléfono.';
    const digits = (val.match(phoneDigitsRegex) || []).length;
    if(digits < 7) return 'El teléfono debe tener al menos 7 dígitos.';
    if(digits > 15) return 'El teléfono parece demasiado largo.';
    return '';
  }

  function validateMensaje(){
    const val = fields.mensaje.value.trim();
    if(!val) return 'Escribe tu mensaje para que podamos ayudarte.';
    if(val.length < 10) return 'El mensaje es muy corto. Describe brevemente tu consulta (mín. 10 caracteres).';
    return '';
  }

  function validateAcepto(){
    if(!fields.acepto.checked) return 'Debes aceptar el uso de tus datos para responder.';
    return '';
  }

  function runAllChecks(){
    const errors = {};
    errors.nombre = validateNombre();
    errors.email = validateEmail();
    errors.telefono = validateTelefono();
    errors.mensaje = validateMensaje();
    errors.acepto = validateAcepto();
    return errors;
  }

  function showErrors(errors){
    let firstInvalid = null;
    Object.keys(errors).forEach(key => {
      const msg = errors[key];
      setError(key, msg);
      if(msg && !firstInvalid){
        firstInvalid = fields[key];
      }
    });
    if(firstInvalid){
      firstInvalid.focus();
    }
    return !firstInvalid; 
  }

  Object.keys(fields).forEach(key => {
    const el = fields[key];
    if(!el) return;
    el.addEventListener('blur', () => {
      const single = {};
      switch(key){
        case 'nombre': single.nombre = validateNombre(); break;
        case 'email': single.email = validateEmail(); break;
        case 'telefono': single.telefono = validateTelefono(); break;
        case 'mensaje': single.mensaje = validateMensaje(); break;
        case 'acepto': single.acepto = validateAcepto(); break;
      }
      setError(key, single[key]);
    });

    el.addEventListener('input', () => {
      statusBox.textContent = '';
      switch(key){
        case 'nombre': if(!validateNombre()) setError('nombre',''); break;
        case 'email': if(!validateEmail()) setError('email',''); break;
        case 'telefono': if(!validateTelefono()) setError('telefono',''); break;
        case 'mensaje': if(!validateMensaje()) setError('mensaje',''); break;
        case 'acepto': if(!validateAcepto()) setError('acepto',''); break;
      }
    });
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const errors = runAllChecks();
    const ok = showErrors(errors);
    if(!ok){
      statusBox.className = 'form-status error';
      statusBox.textContent = 'Hay errores en el formulario. Corrígelos antes de enviar.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    statusBox.className = 'form-status success';
    statusBox.textContent = 'Formulario válido — preparando envío.';

    setTimeout(() => {
      statusBox.textContent = 'Consulta enviada correctamente. Gracias.';
      form.reset();
      Object.keys(fields).forEach(k => setError(k,''));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar consulta';
    }, 900);
  });

  form.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      if(document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
      const errors = runAllChecks();
      const ok = Object.values(errors).every(v => !v);
      if(!ok){
        e.preventDefault();
        showErrors(errors);
        statusBox.className = 'form-status error';
        statusBox.textContent = 'Completa los campos obligatorios antes de continuar.';
      }
    }
  });

})();
