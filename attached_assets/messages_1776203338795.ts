export interface BotMessages {
  welcome: {
    message: string;
    next?: string;
  };
  main_menu: {
    message: string;
    options: Record<string, string>;
    fallback?: string;
  };
  responses: Record<string, {
    message: string;
    next?: string;
    action?: string;
  }>;
  system: {
    timeout: {
      message: string;
      action: string;
    };
    invalid_option: {
      message: string;
      next?: string;
    };
    transfer_message: string;
    offline_message: string;
    timeout_message: string;
    error_message: string;
    thanks_message: string;
    session_ended_message: string;
    evaluation_message: string;
    followup_menu: {
      message: string;
      options: Record<string, string>;
    };
    evaluation_responses: {
      low_rating: string;
      medium_rating: string;
      high_rating: string;
    };
  };
}

export const botMessages: BotMessages = {
  welcome: {
    message: "Olá {name}! 👋 Seja bem-vindo à FONICORP, uma holding de empresas de tecnologia, desenvolvimento web e soluções digitais.\n\nEstamos aqui para te ajudar. Para começar, selecione uma opção no menu abaixo:",
    next: "main_menu"
  },
  main_menu: {
    message: "Para qual empresa é seu atendimento?\n\n1️⃣ Fonicorp\n2️⃣ iSound\n3️⃣ Sonora\n4️⃣ Falar com atendente\n5️⃣ Finalizar atendimento",
    options: {
      "1": "fonicorp",
      "2": "isound", 
      "3": "sonora",
      "4": "attendant_transfer",
      "5": "end_session"
    },
    fallback: "invalid_option"
  },
  responses: {
    fonicorp: {
      message: "📍 Atendimento FONICORP\n\nSomos especialistas em desenvolvimento de sites, landing pages, aplicativos e soluções personalizadas para o seu negócio.\n\nVocê pode nos contatar de duas formas:\n📧 Por e-mail: contato@fonicorp.digital\n🌐 Ou diretamente pela nossa página de orçamento: https://www.fonicorp.digital/orcamento \n\nSe preferir, digite \"Falar com atendente\" para continuar por aqui com um de nossos consultores.",
      next: "main_menu"
    },
    isound: {
      message: "🎵 Atendimento iSound\n\nSe você já é nosso cliente, acesse sua conta e envie uma solicitação diretamente pela plataforma, na área de suporte:\n🌐 https://api.isound.digital/support \n\nPara novos clientes:\n📄 Página de contato: https://isound.digital/contact \n📚 Central de ajuda: https://help.isound.digital \n\n📨 Nosso atendimento funciona de segunda a sexta, das 9h às 18h, por e-mail ou pela própria plataforma.\n\nCaso precise de algo mais, digite \"Falar com atendente\" para ser direcionado ao nosso time de suporte.",
      next: "main_menu"
    },
    sonora: {
      message: "🎶 Atendimento Sonora\n\nNosso atendimento é feito exclusivamente por e-mail.\n📧 Envie sua solicitação para: suporte@sonorabeats.shop\n\nNossa equipe responderá o mais breve possível. Obrigado pela compreensão!",
      next: "main_menu"
    },
    attendant_transfer: {
      message: "🔁 Você está sendo transferido para um de nossos atendentes. Por favor, aguarde um instante... 👨‍💻",
      action: "transfer_to_human"
    },
    end_session: {
      message: "✅ Seu atendimento foi finalizado com sucesso.\n\nObrigado por entrar em contato com a FONICORP. Estamos sempre à disposição!\nTenha um excelente dia! ✨",
      action: "close"
    }
  },
  system: {
    timeout: {
      message: "⚠️ Parece que você está inativo há alguns minutos.\n\nEncerramos o atendimento automaticamente para liberar nosso canal. Se ainda precisar de ajuda, é só enviar uma nova mensagem! 😊",
      action: "close"
    },
    invalid_option: {
      message: "❌ Opção inválida. Por favor, escolha uma das opções listadas no menu.",
      next: "main_menu"
    },
    transfer_message: "🔁 Você está sendo transferido para um de nossos atendentes. Por favor, aguarde um instante... 👨‍💻",
    offline_message: "🕐 Nosso atendimento está fora do horário de funcionamento no momento.\n\nNossos atendentes estão disponíveis de segunda a quinta, das 9h às 18h, e na sexta, das 9h às 17h.\n\nSe precisar de atendimento urgente, deixe sua mensagem que entraremos em contato assim que possível! 📝",
    timeout_message: "⚠️ Parece que você está inativo há alguns minutos.\n\nEncerramos o atendimento automaticamente para liberar nosso canal. Se ainda precisar de ajuda, é só enviar uma nova mensagem! 😊",
    error_message: "❌ Opção inválida. Por favor, escolha uma das opções listadas no menu.",
    thanks_message: "✅ Seu atendimento foi finalizado com sucesso.\n\nObrigado por entrar em contato com a FONICORP. Estamos sempre à disposição!\nTenha um excelente dia! ✨",
    session_ended_message: "⚠️ Seu atendimento foi encerrado.\n\nPara começar um novo atendimento, basta enviar \"Oi\". 😊",
    evaluation_message: "⭐ Como você avalia nosso atendimento?\n\nPor favor, nos dê uma nota de 1 a 5:\n⭐ 1 - Muito insatisfeito\n⭐⭐ 2 - Insatisfeito\n⭐⭐⭐ 3 - Regular\n⭐⭐⭐⭐ 4 - Satisfeito\n⭐⭐⭐⭐⭐ 5 - Muito satisfeito\n\nOu envie sua avaliação em texto livre.\n\nObrigado pelo seu tempo! 🙏",
    followup_menu: {
      message: "O que você gostaria de fazer agora?\n\n1️⃣ Voltar ao menu principal\n2️⃣ Finalizar atendimento",
      options: {
        "1": "main_menu",
        "2": "end_session"
      }
    },
    evaluation_responses: {
      low_rating: "😔 Poxa, sentimos muito que nosso atendimento não tenha atendido às suas expectativas.\n\nSua opinião é muito importante para nós. Vamos trabalhar para melhorar nossos serviços.\n\nObrigado pelo feedback! 🙏",
      medium_rating: "😊 Obrigado pela sua avaliação!\n\nEstamos sempre buscando melhorar nossos serviços. Caso tenha alguma sugestão, ficaremos felizes em ouvir.\n\nTenha um ótimo dia! 👍",
      high_rating: "🌟 Que alegria saber que você ficou satisfeito com nosso atendimento!\n\nSeu feedback nos motiva a continuar oferecendo o melhor serviço possível.\n\nMuito obrigado pela confiança! ✨😊"
    }
  }
};

// Helper function to get message by path
export function getMessage(path: string, replacements: Record<string, string> = {}): string {
  const parts = path.split('.');
  let message: any = botMessages;
  
  for (const part of parts) {
    if (message && typeof message === 'object' && part in message) {
      message = message[part];
    } else {
      return botMessages.system.error_message;
    }
  }
  
  if (typeof message === 'string') {
    let result = message;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(`{${key}}`, value);
    }
    return result;
  }
  
  if (message && typeof message === 'object' && 'message' in message) {
    let result = message.message;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(`{${key}}`, value);
    }
    return result;
  }
  
  return botMessages.system.error_message;
}

// Helper function to get menu options
export function getMenuOptions(): Record<string, string> {
  return botMessages.main_menu.options;
}

// Helper function to check if response has next action
export function getNextAction(responseKey: string): string | null {
  const response = botMessages.responses[responseKey];
  return response?.next || null;
}

// Helper function to check if response has action
export function getResponseAction(responseKey: string): string | null {
  const response = botMessages.responses[responseKey];
  return response?.action || null;
}

// Helper function to get evaluation response based on rating
export function getEvaluationResponse(rating: number): string {
  if (rating >= 1 && rating <= 2) {
    return botMessages.system.evaluation_responses.low_rating;
  } else if (rating === 3) {
    return botMessages.system.evaluation_responses.medium_rating;
  } else if (rating >= 4 && rating <= 5) {
    return botMessages.system.evaluation_responses.high_rating;
  } else {
    // Fallback para avaliações inválidas
    return botMessages.system.evaluation_responses.medium_rating;
  }
}