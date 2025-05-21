import { useRef, useState, useEffect } from "react";
import axios from "axios";
import { Header } from "../../Components/Header";
import { useAuth } from "../../Contexts/AuthContexts";
import { Lista } from "../../Types/Lista";
import { CardData } from "../../Types/Card";
import {
  Container,
  Subtitle,
  Title,
  ButtonPrimary,
  ScrollWrapper,
  ScrollButton,
  Grid,
  ListColumn,
  ColumnTitle,
  CardArea,
  Card,
  ModalOverlay,
  ModalContent,
  Input,
  ButtonGroup,
  ConfirmOverlay,
  ImageUploadArea,
  CreateButton,
  InputWrapper,
  DetalhesContainer,
  Sidebar,
  SidebarCard,
  PrioridadeWrapper,
  ContentArea,
  SaveButton,
  ConfirmBox,
} from "../../Style/Escolar";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { toast } from "react-toastify";

export function Escolar() {
  const { user } = useAuth();
  const userId = user?._id;
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [lists, setLists] = useState<Lista[]>([]);
  const [cards, setCards] = useState<Record<string, CardData[]>>({});
  const [showModal, setShowModal] = useState(false);
  const [listName, setListName] = useState("");
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState("");
  const [cardSelecionado, setCardSelecionado] = useState<CardData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [tituloEditavel, setTituloEditavel] = useState<string>("");

  const [image, setImage] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [modoExcluir, setModoExcluir] = useState(false);
  const [cardParaExcluir, setCardParaExcluir] = useState<CardData | null>(null);

  useEffect(() => {
    const fetchListsAndCards = async () => {
      if (!userId) return;
      try {
        const res = await axios.get(
          `http://localhost:3000/lists/user/${userId}`
        );
        const listas = res.data.data || [];
        setLists(listas);

        if (listas.length === 0) {
          setCards({});
          return;
        }

        const cardsPorLista: Record<string, CardData[]> = {};
        await Promise.all(
          listas.map(async (list: any) => {
            const cardsRes = await axios.get(
              `http://localhost:3000/lists/${list.id}/cards`
            );
            cardsPorLista[list.id] = cardsRes.data.data.map((card: any) => ({
              id: card.id,
              title: card.title,
              userId: card.userId,
              createdAt: card.createdAt,
              pdfs: card.pdfs || [],
            }));
          })
        );

        setCards(cardsPorLista);
      } catch (err) {
        console.error("Erro ao buscar listas ou cards", err);
      }
    };

    fetchListsAndCards();
  }, [userId]);

  const scrollLeft = () =>
    gridRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  const scrollRight = () =>
    gridRef.current?.scrollBy({ left: 300, behavior: "smooth" });

  const reorder = (
    list: CardData[],
    start: number,
    end: number
  ): CardData[] => {
    const result = [...list];
    const [moved] = result.splice(start, 1);
    result.splice(end, 0, moved);
    return result;
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    if (sourceId === destId) {
      const reordered = reorder(
        cards[sourceId],
        source.index,
        destination.index
      );
      setCards((prev) => ({ ...prev, [sourceId]: reordered }));
    } else {
      const sourceCards = Array.from(cards[sourceId]);
      const destCards = Array.from(cards[destId]);
      const [movedCard] = sourceCards.splice(source.index, 1);
      destCards.splice(destination.index, 0, movedCard);
      setCards((prev) => ({
        ...prev,
        [sourceId]: sourceCards,
        [destId]: destCards,
      }));
    }
  };

  const openCardModal = (listId: string) => {
    setSelectedListId(listId);
    setShowCardModal(true);
  };

  const handleCreateList = async () => {
    if (!userId || !listName.trim()) {
      alert("Preencha o nome da lista corretamente.");
      return;
    }

    const payload = {
      name: listName.trim(),
      userId,
    };

    try {
      const res = await axios.post("http://localhost:3000/lists", payload);

      const novaLista = {
        id: res.data.data.id || res.data.data._id,
        name: res.data.data.name,
        userId: res.data.data.userId,
      };

      setLists((prev) => [...prev, novaLista]);
      setListName("");
      setShowModal(false);
    } catch (err: any) {
      console.error("Erro ao criar lista", err);
      if (err.response) {
        console.error("Resposta do backend:", err.response.data);
      }
    }
  };

  const handleCreateCard = async () => {
    if (!cardTitle || !selectedListId) {
      toast.error("Preencha o nome do card.");
      console.log("❌ Título do card ou lista não selecionados.");
      return;
    }

    try {
      console.log("🚀 Iniciando criação do card...");
      console.log("📦 Dados enviados:", {
        title: cardTitle,
        listId: selectedListId,
      });

      const res = await axios.post("http://localhost:3000/cards", {
        title: cardTitle,
        listId: selectedListId,
      });

      const newCard = {
        id: res.data.data.id,
        title: res.data.data.title,
        userId: res.data.data.userId,
      };

      console.log("✅ Card criado com sucesso:", newCard);
      toast.success("Card criado com sucesso!");

      // Upload da imagem, se houver
      if (image) {
        console.log("🖼️ Iniciando upload da imagem:", image.name);
        const formData = new FormData();
        formData.append("files", image);

        await axios.post(
          `http://localhost:3000/cards/${newCard.id}/files`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        console.log("✅ Upload da imagem concluído.");
        toast.success("Imagem enviada com sucesso.");
      } else {
        console.log("ℹ️ Nenhuma imagem selecionada.");
      }

      setCards((prev) => ({
        ...prev,
        [selectedListId]: [...(prev[selectedListId] || []), newCard],
      }));
      console.log("🗂️ Card adicionado ao estado.");

      setShowCardModal(false);
      setCardTitle("");
      setImage(null);
      console.log("🧹 Formulário resetado. Modal fechado.");
    } catch (err) {
      console.error("💥 Erro ao criar card ou enviar imagem:", err);
      toast.error("Erro ao criar card ou enviar imagem.");
    }
  };
  const handleDeleteCard = async () => {
    if (!cardParaExcluir || !selectedListId) return;
    try {
      await axios.delete(`http://localhost:3000/cards/${cardParaExcluir.id}`);
      setCards((prev) => ({
        ...prev,
        [selectedListId]: prev[selectedListId].filter(
          (c) => c.id !== cardParaExcluir.id
        ),
      }));
      setCardParaExcluir(null);
      setConfirmDelete(false);
      setModoExcluir(false); // Sai do modo excluir após deletar
    } catch (err) {
      console.error("Erro ao excluir card", err);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!cardSelecionado || !novoTitulo.trim() || !selectedListId) {
      console.log("Dados insuficientes para editar.");
      return;
    }

    try {
      console.log("Editando título...");
      const res = await axios.patch(
        `http://localhost:3000/cards/${cardSelecionado.id}`,
        { title: novoTitulo.trim() }
      );

      console.log("Título atualizado:", res.data.data.title);

      // Upload de arquivos (imagem e/ou PDF)
      if (image || pdf) {
        const formData = new FormData();
        if (image) formData.append("files", image);
        if (pdf) formData.append("files", pdf);

        await axios.post(
          `http://localhost:3000/cards/${cardSelecionado.id}/files`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        console.log("Arquivos enviados com sucesso.");
      }

      setCards((prev) => ({
        ...prev,
        [selectedListId]: prev[selectedListId].map((c) =>
          c.id === cardSelecionado.id ? { ...c, title: res.data.data.title } : c
        ),
      }));

      setCardSelecionado({ ...cardSelecionado, title: res.data.data.title });
      setEditModalOpen(false);
      setImage(null);
      setPdf(null);
      console.log("Edição concluída.");
    } catch (err) {
      console.error("Erro ao editar card ou enviar arquivos", err);
    }
  };

  const handleSalvarDetalhes = async () => {
    if (!cardSelecionado || !tituloEditavel.trim() || !selectedListId) {
      toast.error("Preencha o título corretamente.");
      return;
    }

    try {
      // Atualiza o título
      const res = await axios.patch(
        `http://localhost:3000/cards/${cardSelecionado.id}`,
        { title: tituloEditavel.trim() }
      );

      const updatedCard = {
        ...cardSelecionado,
        title: res.data.data.title,
      };

      // Upload do PDF se houver
      if (pdf) {
        const formData = new FormData();
        formData.append("files", pdf);

        const fileRes = await axios.post(
          `http://localhost:3000/cards/${cardSelecionado.id}/files`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const uploadedPdfs = fileRes.data.data.pdfs || [];

        updatedCard.pdfs = uploadedPdfs;
      }

      setCards((prev) => ({
        ...prev,
        [selectedListId]: prev[selectedListId].map((c) =>
          c.id === cardSelecionado.id ? updatedCard : c
        ),
      }));

      // Atualiza no modal
      setCardSelecionado(updatedCard);

      toast.success("Card atualizado com sucesso.");
      setPdf(null);
    } catch (error) {
      console.error("Erro ao atualizar card:", error);
      toast.error("Erro ao atualizar card.");
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await axios.delete(`http://localhost:3000/lists/${listId}`);
      setLists((prev) => prev.filter((list) => list.id !== listId));
      setCards((prev) => {
        const updated = { ...prev };
        delete updated[listId];
        return updated;
      });
    } catch (err) {
      console.error("Erro ao excluir lista", err);
    }
  };

  const handleExibirDetalhes = async (cardId: string, listId: string) => {
    const card = cards[listId]?.find((c) => c.id === cardId);
    if (card) {
      setCardSelecionado(card);
      setSelectedListId(listId);
      setTituloEditavel(card.title);

      try {
        const res = await axios.get(`http://localhost:3000/cards/${card.id}`);
        const cardData = res.data.data;
        setCardSelecionado({
          ...card,
          pdfs: cardData.pdfs || [],
        });
      } catch (err) {
        console.error("Erro ao buscar detalhes do card:", err);
      }
    }
  };

  return (
    <>
      <Header />
      <Container>
        <Subtitle>#escolar</Subtitle>
        <Title>O que vamos estudar hoje?</Title>
        <ButtonPrimary onClick={() => setShowModal(true)}>
          + Criar nova lista
        </ButtonPrimary>
        <ButtonPrimary
          style={{ backgroundColor: modoExcluir ? "red" : "#222" }}
          onClick={() => setModoExcluir(!modoExcluir)}
        >
          {modoExcluir ? "Cancelar Exclusão" : "Excluir Card"}
        </ButtonPrimary>

        <ScrollWrapper>
          <ScrollButton left onClick={scrollLeft}>
            ⬅
          </ScrollButton>
          <ScrollButton onClick={scrollRight}>➡</ScrollButton>

          <DragDropContext onDragEnd={onDragEnd}>
            <Grid ref={gridRef}>
              {lists.map((list) => (
                <Droppable droppableId={list.id} key={list.id}>
                  {(provided) => (
                    <ListColumn
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <ColumnTitle>{list.name}</ColumnTitle>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        style={{
                          alignSelf: "flex-end",
                          background: "transparent",
                          color: "red",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "14px",
                          marginBottom: "8px",
                        }}
                      >
                        Excluir Lista
                      </button>

                      <CardArea>
                        {(cards[list.id] || []).map((card, index) => (
                          <Draggable
                            draggableId={card.id}
                            index={index}
                            key={card.id}
                          >
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onMouseDown={() =>
                                  ((card as any).clickStart = Date.now())
                                }
                                onClick={() => {
                                  const now = Date.now();
                                  if (modoExcluir) {
                                    setCardParaExcluir(card);
                                    setSelectedListId(list.id);
                                    setConfirmDelete(true);
                                  } else if (
                                    (card as any).clickStart &&
                                    now - (card as any).clickStart < 150
                                  ) {
                                    handleExibirDetalhes(card.id, list.id);
                                  }
                                }}
                                style={{
                                  border: modoExcluir
                                    ? "2px dashed red"
                                    : "none",
                                  position: "relative",
                                  transition: "0.3s",
                                }}
                                onMouseEnter={(e) => {
                                  if (modoExcluir) {
                                    e.currentTarget.style.background =
                                      "#ff4d4d";
                                    const icon = e.currentTarget.querySelector(
                                      ".icon-excluir"
                                    ) as HTMLElement;
                                    if (icon) icon.style.display = "flex";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (modoExcluir) {
                                    e.currentTarget.style.background = "";
                                    const icon = e.currentTarget.querySelector(
                                      ".icon-excluir"
                                    ) as HTMLElement;
                                    if (icon) icon.style.display = "none";
                                  }
                                }}
                              >
                                {/* Conteúdo do Card */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    opacity: modoExcluir ? 0.2 : 1,
                                    gap: "8px",
                                  }}
                                >
                                  {/* Nome do Card */}
                                  <span style={{ fontWeight: "500" }}>
                                    {card.title}
                                  </span>

                                  {/* Foto do Usuário */}
                                  <img
                                    src={
                                      user?.profileImage ||
                                      "https://via.placeholder.com/24"
                                    }
                                    alt="foto"
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      objectFit: "cover",
                                    }}
                                  />
                                </div>

                                {/* Ícone de excluir no meio */}
                                <div
                                  className="icon-excluir"
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    color: "white",
                                    fontSize: "24px",
                                    display: "none",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    pointerEvents: "none",
                                  }}
                                >
                                  ❌
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        <Card onClick={() => openCardModal(list.id)}>
                          + Adicionar Card
                        </Card>
                      </CardArea>
                    </ListColumn>
                  )}
                </Droppable>
              ))}
            </Grid>
          </DragDropContext>
        </ScrollWrapper>
      </Container>

      {cardSelecionado && (
        <ModalOverlay>
          <DetalhesContainer>
            {/* Sidebar */}
            <Sidebar>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <img
                  src={user?.profileImage || "https://via.placeholder.com/40"}
                  alt="Foto de perfil"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    objectFit: "cover",
                  }}
                />
                <div>
                  <p style={{ margin: 0, fontWeight: "bold" }}>{user?.name}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>
                    Criador premium
                  </p>
                </div>
              </div>

              <SidebarCard>
                <h4>#titulo</h4>
                <input
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#111",
                    color: "white",
                  }}
                  value={tituloEditavel}
                  onChange={(e) => setTituloEditavel(e.target.value)}
                />
              </SidebarCard>

              <SidebarCard>
                <h4>#prioridade</h4>
                <PrioridadeWrapper>
                  <span>
                    <div className="baixa" /> Baixa
                  </span>
                  <span>
                    <div className="media" /> Média
                  </span>
                  <span>
                    <div className="alta" /> Alta
                  </span>
                </PrioridadeWrapper>
              </SidebarCard>

              <SidebarCard>
                <h4>#origem</h4>
                <p>Minha Criação</p>
              </SidebarCard>
            </Sidebar>

            {/* Content */}
            <ContentArea>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2>{tituloEditavel}</h2>
                <button
                  onClick={() => setCardSelecionado(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "white",
                  }}
                >
                  ❌
                </button>
              </div>

              <hr />

              {/* Visualização do PDF */}
              {cardSelecionado?.pdfs && cardSelecionado.pdfs.length > 0 ? (
                <div
                  style={{
                    width: "100%",
                    height: "500px",
                    background: "#eaeaea",
                    borderRadius: "20px",
                    marginBottom: "20px",
                    overflow: "hidden",
                  }}
                >
                  <iframe
                    src={`http://localhost:3000${cardSelecionado.pdfs[0].url}`}
                    title={cardSelecionado.pdfs[0].filename}
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "500px",
                    background: "#eaeaea",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                    flexDirection: "column",
                  }}
                >
                  <p style={{ fontWeight: "500", color: "#444" }}>
                    Nenhum PDF encontrado, envie um!
                  </p>
                  <button
                    onClick={() =>
                      document.getElementById("fileInput")?.click()
                    }
                    style={{
                      background: "#111",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "30px",
                      cursor: "pointer",
                      marginTop: "10px",
                    }}
                  >
                    ⬆️ Upar PDF
                  </button>
                  <input
                    type="file"
                    id="fileInput"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPdf(file);
                        console.log("📄 PDF selecionado:", file.name);
                      }
                    }}
                  />
                </div>
              )}

              <SaveButton onClick={handleSalvarDetalhes}>Salvar</SaveButton>
            </ContentArea>
          </DetalhesContainer>
        </ModalOverlay>
      )}

      {editModalOpen && (
        <ModalOverlay>
          <ModalContent>
            <h3>Editar Título</h3>
            <Input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            {image && (
              <p style={{ marginBottom: "8px" }}>
                🖼️ <strong>Imagem selecionada:</strong> {image.name}
              </p>
            )}

            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdf(e.target.files?.[0] || null)}
            />
            {pdf && (
              <p style={{ marginBottom: "8px" }}>
                📄 <strong>PDF selecionado:</strong> {pdf.name}
              </p>
            )}

            <ButtonGroup>
              <button
                className="cancel"
                onClick={() => setEditModalOpen(false)}
              >
                Cancelar
              </button>
              <button className="confirm" onClick={handleSalvarEdicao}>
                Salvar
              </button>
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}

      {confirmDelete && (
        <ConfirmOverlay>
          <ConfirmBox>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja excluir o card <strong>{cardParaExcluir?.title}</strong>?
            </p>
            <ButtonGroup>
              <button
                className="cancel"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </button>
              <button className="confirm" onClick={handleDeleteCard}>
                Confirmar
              </button>
            </ButtonGroup>
          </ConfirmBox>
        </ConfirmOverlay>
      )}

      {showModal && (
        <ModalOverlay>
          <ModalContent>
            <h3>Nova Lista</h3>
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Nome da lista"
            />
            <ButtonGroup>
              <button className="confirm" onClick={handleCreateList}>
                Criar
              </button>
              <button className="cancel" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}

      {showCardModal && (
        <ModalOverlay>
          <ModalContent>
            <h2>Criando seu card</h2>

            <p>Imagem que aparecerá na comunidade</p>
            <ImageUploadArea
              onClick={() => document.getElementById("imageInput")?.click()}
            >
              {image ? (
                <img src={URL.createObjectURL(image)} alt="Preview" />
              ) : (
                <span>📷</span>
              )}
            </ImageUploadArea>

            <input
              type="file"
              id="imageInput"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />

            <p>Defina o nome do card</p>
            <InputWrapper>
              <span>✏️</span>
              <input
                placeholder="Nome do card"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
              />
            </InputWrapper>

            <CreateButton onClick={handleCreateCard}>CRIAR</CreateButton>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}
