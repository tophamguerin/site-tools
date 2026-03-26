// Form Tester — run via Chrome MCP evaluate_script
// Discovers all forms on the page and extracts their fields, validation attributes,
// and submit buttons for systematic testing.
//
// Usage: Run the function body via evaluate_script. Returns form descriptions.
// The skill then tests each form's validation by attempting empty/invalid submissions.

// eslint-disable-next-line no-unused-vars
const formTester = () => {
  const forms = [];

  // Find explicit <form> elements
  document.querySelectorAll('form').forEach((form, idx) => {
    const fields = [];
    form.querySelectorAll('input, textarea, select, [contenteditable="true"]').forEach(field => {
      const type = field.type || field.tagName.toLowerCase();
      if (type === 'hidden') return;

      fields.push({
        tag: field.tagName.toLowerCase(),
        type,
        name: field.name || field.id || null,
        label: field.getAttribute('aria-label')
          || field.closest('label')?.textContent.trim().slice(0, 60)
          || document.querySelector(`label[for="${field.id}"]`)?.textContent.trim().slice(0, 60)
          || field.placeholder
          || null,
        required: field.required || field.getAttribute('aria-required') === 'true',
        pattern: field.pattern || null,
        minLength: field.minLength > 0 ? field.minLength : null,
        maxLength: field.maxLength > 0 ? field.maxLength : null,
        hasValue: !!field.value,
        disabled: field.disabled,
        readOnly: field.readOnly
      });
    });

    const submitButtons = [...form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])')].map(btn => ({
      text: btn.textContent.trim().slice(0, 40) || btn.value || '[no text]',
      disabled: btn.disabled
    }));

    forms.push({
      index: idx,
      id: form.id || null,
      action: form.action || null,
      method: form.method || 'get',
      name: form.name || null,
      ariaLabel: form.getAttribute('aria-label') || null,
      fieldCount: fields.length,
      requiredCount: fields.filter(f => f.required).length,
      fields,
      submitButtons,
      hasNoValidate: form.noValidate
    });
  });

  // Also find implicit forms (groups of inputs not inside a <form>)
  const orphanInputs = document.querySelectorAll('input:not(form input), textarea:not(form textarea), select:not(form select)');
  if (orphanInputs.length > 0) {
    const orphanFields = [...orphanInputs]
      .filter(f => f.type !== 'hidden' && f.offsetParent !== null)
      .map(field => ({
        tag: field.tagName.toLowerCase(),
        type: field.type || field.tagName.toLowerCase(),
        name: field.name || field.id || null,
        label: field.getAttribute('aria-label')
          || field.closest('label')?.textContent.trim().slice(0, 60)
          || null,
        required: field.required,
        hasValue: !!field.value
      }));

    if (orphanFields.length > 0) {
      forms.push({
        index: forms.length,
        type: 'implicit',
        note: 'Input fields found outside of any <form> element',
        fieldCount: orphanFields.length,
        fields: orphanFields
      });
    }
  }

  return {
    url: window.location.href,
    formCount: forms.length,
    forms,
    summary: {
      totalFields: forms.reduce((sum, f) => sum + f.fieldCount, 0),
      totalRequired: forms.reduce((sum, f) => sum + (f.requiredCount || 0), 0),
      formsWithoutSubmit: forms.filter(f => f.submitButtons && f.submitButtons.length === 0).length,
      implicitForms: forms.filter(f => f.type === 'implicit').length
    }
  };
};
