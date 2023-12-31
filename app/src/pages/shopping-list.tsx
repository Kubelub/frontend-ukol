import styled from "@emotion/styled";
import { useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import useSWR, { mutate } from "swr";
import { useParams } from "wouter";
import Button, { ButtonType } from "../components/button";
import CheckBox from "../components/checkbox";
import EmptyState from "../components/emptyState";
import ShoppingItem from "../components/shopping-item";
import { ModalAddShoppingItem, ModalArchive, ModalChangeUsers, ModalConfirmItemDelete, ModalConfirmShoppingListDelete, ModalEditShoppingListName, ModalLeaveShoppingList } from "../components/shopping-list-actions";
import { GENERAL_ERROR_MESSAGE, postData } from "../network";
import { GlobalContext, ShoppingListType, getTextAfterLanguage } from "../utils/contexts";
import ErrorPage from "./error-page";

export interface ShoppingItemType {
    name: string
    done: boolean
    id: number
    count: number
}

export interface User {
    name: string
    id: number
    active: boolean
}

const ShoppingList = () => {
    const {shoppingListSlug} = useParams();
    const { data, error, mutate: mutateShoppingList } = useSWR<{list: ShoppingListType, items: ShoppingItemType[], users: User[]}>(`shopping-list/${shoppingListSlug}`);
    
    const { activeUserToken, showContextMenu, showArchived, setShowArchived, activeLanguage } = useContext(GlobalContext);

    const [modalEditShoppingListName, setModalEditShoppingListName] = useState(false);
    const [modalArchive, setModalArchive] = useState(false);
    const [modalAddShoppingItem, setModalAddShoppingItem] = useState(false);
    const [modalChangeUsers, setModalChangeUsers] = useState(false);
    const [modalConfirmItemDeleteID, setModalConfirmItemDeleteID] = useState(-1);
    const [modalConfirmShoppingListDelete, setModalConfirmShoppingListDelete] = useState(false);
    const [modalLeaveShoppingListActive, setModalLeaveShoppingListActive] = useState(false);

    const [showDone, setShowDone] = useState(true);

    const optionsRef = useRef(null);

    useEffect(() => {
        if (data?.list.archived && !showArchived) setShowArchived(true); 
    }, [data]);

    if (error) return <ErrorPage/>;

    if (!data) return <>{getTextAfterLanguage("Náčítání...", "Loading...", activeLanguage)}</>

    return (
        <>
            <Helmet>
                <meta property="og:title" content={`${location} | SHOPPING LIST}`}/>
                <title>List | SHOPPING LIST</title>
            </Helmet>
            {modalConfirmShoppingListDelete && 
                <ModalConfirmShoppingListDelete
                    shoppingListName={data.list.name}
                    hide={async(refetch?: boolean) => {
                        if (refetch) await mutateShoppingList();
                        setModalConfirmShoppingListDelete(false);
                    }}
                    id={data.list.id}
                />
            }
            {modalConfirmItemDeleteID != -1 &&
                <ModalConfirmItemDelete
                    name={data.list.name}
                    id={data.list.id}
                    hide={async(refetch?: boolean) => {
                        if (refetch) await mutateShoppingList();
                        setModalConfirmItemDeleteID(-1);
                    }}
                    
                />
            }
            {modalArchive &&
                <ModalArchive
                    shoppingListName={data.list.name}
                    archived={data.list.archived}
                    hide={async(refetch?: boolean) => {
                        if (refetch) {
                            if (!data.list.archived) setShowArchived(true);
                            await mutateShoppingList();
                            await mutate("shopping-list");
                        }
                        setModalArchive(false);
                    }}
                    id={data.list.id}
                />
            }
            {modalEditShoppingListName &&
                <ModalEditShoppingListName
                    defaultValue={data.list.name}
                    hide={async(newSlug?: string) => {
                        if (newSlug) {
                            window.location.href = `/${newSlug}`;
                            await mutateShoppingList();
                            await mutate("/shopping-list");
                        }
                        setModalEditShoppingListName(false);
                    }}
                    id={data.list.id}
                />
            }
            {modalAddShoppingItem && 
                <ModalAddShoppingItem
                    hide={async(refetch?: boolean) => {
                        if (refetch) await mutateShoppingList();
                        setModalAddShoppingItem(false);
                    }}
                    id={data.list.id}
                />
            }
            {modalChangeUsers &&
                <ModalChangeUsers
                    id={data.list.id}
                    _activeUsers={data.list.members}
                    users={data.users}
                    hide={async(refetch) => {
                        if (refetch) await mutateShoppingList();
                        setModalChangeUsers(false);
                    }}
                />
            }
            {modalLeaveShoppingListActive && 
                <ModalLeaveShoppingList
                    id={data.list.id}
                    name={data.list.name}
                    hide={async(refetch?: boolean) => {
                        if (refetch) await mutateShoppingList();
                        setModalLeaveShoppingListActive(false);
                    }}
                />
            }

            <Wrapper>
                <>
                    <div>
                        <Label>
                            {data.list.name}
                        </Label>
                        
                        <Button 
                            ref={optionsRef} 
                            onClick={() => {
                                if (data.users.filter(user => user.id == data.list.owner)[0]?.token == activeUserToken) {
                                    showContextMenu(
                                        [
                                            {
                                                label: getTextAfterLanguage("Změnit název nákupního listu", "Change name of shopping list", activeLanguage), 
                                                action: () => setModalEditShoppingListName(true),
                                            },
                                            {
                                                label: data.list.archived ? getTextAfterLanguage("Zrušit archivaci", "Cancel archivation", activeLanguage) : getTextAfterLanguage("Archivovat", "Archive", activeLanguage), 
                                                action: () => setModalArchive(true),
                                            },
                                            {
                                                label: getTextAfterLanguage("Upravit členy", "Edit users", activeLanguage), 
                                                action: () => setModalChangeUsers(true),
                                            },
                                            {
                                                label: getTextAfterLanguage("Odstranit seznam", "Delete shopping list", activeLanguage), 
                                                action: () => setModalConfirmShoppingListDelete(true),
                                            },
                                        ], optionsRef.current
                                    );
                                    return;
                                }
                                showContextMenu(
                                    [
                                        {
                                            label: getTextAfterLanguage("Odejít", "Leave", activeLanguage), 
                                            action: () => setModalLeaveShoppingListActive(true),
                                        },
                                    ], optionsRef.current
                                );                           
                            }}
                        >
                            <i className="fa fa-ellipsis white-text" />
                        </Button>
                    </div>
                    
                    {data.items.length != 0 ? 
                        <>
                            <CheckBox label={getTextAfterLanguage("Zobrazit dokončené", "Show done", activeLanguage)} onClick={() => setShowDone(p => !p)} checked={showDone} />
                            {data.items.sort((a, b) => {
                                if(a.done == b.done) return 0;
                                if (a.done) return 1;
                                return -1;
                            }).filter((shoppingItem) => showDone ? true : shoppingItem.done == false).map((shoppingItem, i) => 
                                <ShoppingItem 
                                    key={i} 
                                    onDelete={() => setModalConfirmItemDeleteID(shoppingItem.id)}
                                    {...shoppingItem} 
                                    onDoneToogle={async () => {
                                        try {
                                            await postData(`shopping-item/toggle-done/${shoppingItem.id}`, {}, activeUserToken);
                                            await mutateShoppingList();
                                        } catch (e) {
                                            console.error(e);
                                            alert(GENERAL_ERROR_MESSAGE);
                                        }
                                    }}
                                >
                                    {shoppingItem.name}
                                </ShoppingItem>
                            )}
                        </>    
                        :
                        <EmptyState
                            label={getTextAfterLanguage("Žádné položky", "No items", activeLanguage)}
                            description={getTextAfterLanguage("Tento nákupní seznam nemá žádné položky", "This shopping list has no items", activeLanguage)}
                        />
                }
                    
                    <div style={{display: "flex", "justifyContent": "center"}}>
                        <Button onClick={() => setModalAddShoppingItem(true)} buttonType={ButtonType.PRIMARY}>
                            {getTextAfterLanguage("Přidat Položku", "Add item", activeLanguage)}
                        </Button>
                    </div>
                </>
            </Wrapper>
        </>
    );
}

const Label = styled("h3")`
    font: ${p => p.theme.fontStyles.h3};
`;

const Wrapper = styled("div")`
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;

    > div:first-of-type {
        display: flex;
        align-content: center;
        gap: 20px;
    }
`;

export default ShoppingList;