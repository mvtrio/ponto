type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Aviso de que a fila de aprovações mudou.
 *
 * O sino fica no cabeçalho e a tela de Aprovações é outro componente — não há estado
 * compartilhado entre eles. Sem este sinal, o contador só se corrigiria no próximo ciclo
 * de releitura, deixando o admin ver "3 pendentes" logo depois de aprovar as três.
 *
 * É deliberadamente um pub/sub mínimo: quem publica não sabe quem escuta, e o dado real
 * continua vindo do banco — ninguém aqui tenta adivinhar a contagem nova.
 */
export function notifyPendingApprovalsChanged(): void {
  for (const listener of listeners) listener();
}

/** Registra um ouvinte e devolve a função que o remove. */
export function subscribeToPendingApprovals(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
