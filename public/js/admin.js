document.addEventListener('DOMContentLoaded', () => {
    /* ---------- Alertas ---------- */
    document.querySelectorAll('[data-dismiss-alert]').forEach((btn) => {
        btn.addEventListener('click', () => btn.closest('.alert')?.remove());
    });

    /* ---------- Confirmação de ações destrutivas ---------- */
    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;

        const mensagem = form.dataset.confirm;
        if (!mensagem) return;

        event.preventDefault();

        abrirConfirmacao(form.dataset.confirmTitulo || 'Confirmar ação', mensagem, () => form.submit());
    });

    /* ---------- Diálogos ---------- */
    document.addEventListener('click', (event) => {
        const alvo = event.target;

        const abrir = alvo.closest('[data-open-dialog]');
        if (abrir) {
            const dialog = document.getElementById(abrir.dataset.openDialog);
            if (dialog?.showModal) dialog.showModal();
            return;
        }

        if (alvo.closest('[data-close-dialog]')) {
            alvo.closest('dialog')?.close();
            return;
        }

        if (alvo.tagName === 'DIALOG') {
            alvo.close();
        }
    });

    /* ---------- Preview de upload ---------- */
    document.querySelectorAll('input[type="file"][data-preview]').forEach((input) => {
        input.addEventListener('change', () => {
            const preview = document.getElementById(input.dataset.preview);
            const file = input.files && input.files[0];

            if (preview && file && file.type.startsWith('image/')) {
                preview.src = URL.createObjectURL(file);
            }
        });
    });

    document.querySelectorAll('.upload-drop').forEach((drop) => {
        const input = drop.querySelector('input[type="file"]');
        if (!input) return;

        const rotulo = drop.querySelector('[data-dropzone-label]');
        const preview = drop.querySelector('.upload-preview');
        const textoOriginal = rotulo ? rotulo.textContent.trim() : '';

        const mostrar = (file) => {
            if (rotulo && file) rotulo.textContent = file.name;

            if (preview && file && file.type.startsWith('image/')) {
                preview.src = URL.createObjectURL(file);
                preview.hidden = false;
            }
        };

        input.addEventListener('change', () => mostrar(input.files && input.files[0]));

        ['dragenter', 'dragover'].forEach((tipo) => {
            drop.addEventListener(tipo, (event) => {
                event.preventDefault();
                drop.classList.add('is-dragging');
            });
        });

        ['dragleave', 'drop'].forEach((tipo) => {
            drop.addEventListener(tipo, () => drop.classList.remove('is-dragging'));
        });

        drop.addEventListener('drop', (event) => {
            event.preventDefault();

            const arquivo = event.dataTransfer?.files?.[0];
            if (!arquivo) return;

            try {
                const transfer = new DataTransfer();
                transfer.items.add(arquivo);
                input.files = transfer.files;
                mostrar(arquivo);
            } catch (err) {
                if (rotulo) rotulo.textContent = arquivo.name;
            }
        });

        /* Em <label> o clique nativo já abre o seletor. */
        if (drop.tagName !== 'LABEL') {
            drop.addEventListener('click', (event) => {
                if (!event.target.closest('.upload-preview')) {
                    input.click();
                }
            });
        }
    });

    /* ---------- Prévia rápida de áudio ---------- */
    const dialogPreview = document.getElementById('previewDialog');
    const audioPreview = document.getElementById('previewAudio');

    if (dialogPreview && audioPreview) {
        document.querySelectorAll('[data-audio-preview]').forEach((btn) => {
            btn.addEventListener('click', () => {
                audioPreview.src = btn.dataset.audioPreview;
                audioPreview.play().catch(() => {});
                dialogPreview.showModal();
            });
        });

        dialogPreview.addEventListener('close', () => {
            audioPreview.pause();
            audioPreview.removeAttribute('src');
        });
    }
});

/* ---------- Diálogo de confirmação ---------- */
function abrirConfirmacao(titulo, mensagem, aoConfirmar) {
    const existente = document.getElementById('confirmDialog');

    if (existente) existente.remove();

    const dialog = document.createElement('dialog');
    dialog.id = 'confirmDialog';
    dialog.className = 'preview-dialog';

    dialog.innerHTML = `
        <h3>${escapar(titulo)}</h3>
        <p>${escapar(mensagem)}</p>
        <div class="form-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-cancelar>Cancelar</button>
            <button type="button" class="btn btn-danger btn-sm" data-confirmar>Sim, confirmar</button>
        </div>
    `;

    dialog.querySelector('[data-cancelar]').addEventListener('click', () => dialog.close());

    dialog.querySelector('[data-confirmar]').addEventListener('click', () => {
        dialog.close();
        dialog.remove();
        aoConfirmar();
    });

    dialog.addEventListener('cancel', () => dialog.remove());

    document.body.appendChild(dialog);
    dialog.showModal();
}

function escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
}