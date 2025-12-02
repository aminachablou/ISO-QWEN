import { useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

interface Source {
  document: string;
  section: string;
  subsection: string;
  chunk_id: number;
  page: number | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
}

interface ChatResponse {
  answer: string;
  sources: Source[] | null;
  error?: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    // 1. Création de conversation (Optionnel en mode local, on garde pour la forme)
    let convId = conversationId;
    if (!convId) {
      try {
        // On tente de créer une conversation, mais on ne bloque pas si ça échoue (car pas de vraie database)
        const { data: newConv, error: convError } = await supabase
          .from("chat_conversations")
          .insert({ title: content.slice(0, 50) + (content.length > 50 ? "..." : "") })
          .select()
          .single();
        
        if (!convError && newConv) {
          convId = newConv.id;
          setConversationId(convId);
        }
      } catch (e) {
        console.warn("Mode hors ligne: Impossible de sauvegarder l'historique conversation", e);
      }
    }

    // 2. Affichage immédiat du message utilisateur
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      console.log("📡 Envoi de la question au cerveau Python...");

      // --- 🚨 MODIFICATION MAJEURE ICI 🚨 ---
      // On remplace 'supabase.functions.invoke' par un 'fetch' vers ton PC
      
      const response = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: content }), // 'query' est ce qu'attend ton python
      });

      if (!response.ok) {
        throw new Error(`Erreur de connexion au serveur Python (Status: ${response.status})`);
      }

      const data: ChatResponse = await response.json();
      console.log("✅ Réponse reçue du Python:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      // 3. Affichage de la réponse de l'IA
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer || "Désolé, je n'ai pas pu générer de réponse.",
        sources: data.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue. Vérifiez que le terminal noir tourne.";
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Petit message d'aide dans le chat en cas d'erreur
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "⚠️ Erreur de connexion. Assurez-vous que le terminal noir (Backend Python) est bien lancé et affiche 'Application startup complete'.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const newChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    newChat,
    conversationId,
  };
};