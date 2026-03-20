import {
  Film,
  Layers,
  CircleDot,
  Plus,
  Users,
  Trash2,
} from "lucide-react";

import { useState } from "react";

import {
  createCategory,
  createPerson,
  deleteCategory,
  deletePerson,
} from "../../services/api";

export interface SidebarProps {
  categories: string[];

  people: string[];

  selectedCategory: string;

  selectedPerson: string;

  onCategoryChange: (
    category: string
  ) => void;

  onPersonChange: (
    person: string
  ) => void;

  isOpen: boolean;

  onClose: () => void;
}

const Sidebar = ({
  categories,
  people,
  selectedCategory,
  selectedPerson,
  onCategoryChange,
  onPersonChange,
  isOpen,
  onClose,
}: SidebarProps) => {

  const navItems = [
    "All Clips",
    ...new Set(categories),
  ];

  const peopleItems = [
    "All People",
    ...new Set(people),
  ];

  const [newCategory,
    setNewCategory] =
    useState("");

  const [newPerson,
    setNewPerson] =
    useState("");

  const [showCreateCategory,
    setShowCreateCategory] =
    useState(false);

  const [showCreatePerson,
    setShowCreatePerson] =
    useState(false);

  const handleCreateCategory =
    async () => {
      if (!newCategory.trim())
        return;

      try {
        await createCategory(
          newCategory
        );

        window.location.reload();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to create category"
        );
      }
    };

  const handleCreatePerson =
    async () => {
      if (!newPerson.trim())
        return;

      try {
        await createPerson(
          newPerson
        );

        window.location.reload();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to create person"
        );
      }
    };

  const handleDeleteCategory =
    async (category: string) => {
      if (
        category === "All Clips"
      )
        return;

      if (
        !window.confirm(
          `Delete category "${category}"?`
        )
      )
        return;

      try {
        await deleteCategory(
          category
        );

        window.location.reload();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to delete category"
        );
      }
    };

  const handleDeletePerson =
    async (person: string) => {
      if (
        person === "All People"
      )
        return;

      if (
        !window.confirm(
          `Delete person "${person}"?`
        )
      )
        return;

      try {
        await deletePerson(
          person
        );

        window.location.reload();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to delete person"
        );
      }
    };

  return (
    <>
      <div
        className={`
          fixed inset-0 bg-black/60 z-40 md:hidden
          ${isOpen ? "block" : "hidden"}
        `}
        onClick={onClose}
      />

      <aside
        className={`
          fixed md:relative
          z-50
          h-full
          w-[280px]
          bg-slate-950
          border-r
          border-slate-800
          text-slate-100
          flex
          flex-col
          transition-transform
          duration-300

          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div className="px-6 py-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-12 h-12 flex items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-500 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Film size={24} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Clipage
            </p>

            <h1 className="text-xl font-semibold tracking-tight">
              Dashboard
            </h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <nav className="mt-8 px-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Categories
              </p>

              <button
                onClick={() =>
                  setShowCreateCategory(
                    !showCreateCategory
                  )
                }
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                <Plus size={14} />
              </button>
            </div>

            {showCreateCategory && (
              <div className="mb-4 space-y-2">
                <input
                  placeholder="Category name"
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-sm"
                />

                <button
                  onClick={
                    handleCreateCategory
                  }
                  className="w-full rounded-xl bg-cyan-500 text-black font-medium p-2"
                >
                  Create Category
                </button>
              </div>
            )}

            <div className="space-y-2 pb-4">
              {navItems.map(
                (category) => {

                  const isActive =
                    category ===
                    selectedCategory;

                  const Icon =
                    category ===
                    "All Clips"
                      ? Layers
                      : CircleDot;

                  return (
                    <div
                      key={category}
                      className="flex items-center gap-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onCategoryChange(
                            category
                          )
                        }
                        className={`flex-1 text-left rounded-3xl px-4 py-3 flex items-center gap-3 transition duration-200 ease-out ${
                          isActive
                            ? "bg-slate-800 text-cyan-300 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                            : "bg-slate-950 hover:bg-slate-900 hover:text-slate-100"
                        }`}
                      >
                        <span
                          className={`p-2 rounded-2xl ${
                            isActive
                              ? "bg-cyan-500/10 text-cyan-300"
                              : "bg-slate-900 text-slate-400"
                          }`}
                        >
                          <Icon size={18} />
                        </span>

                        <span className="flex-1 text-sm font-medium truncate">
                          {category}
                        </span>
                      </button>

                      {category !== "All Clips" && (
                        <button
                          onClick={() =>
                            handleDeleteCategory(
                              category
                            )
                          }
                          className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      )}
                    </div>
                  );
                }
              )}
            </div>
            <div className="mt-8">

              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
                  <Users size={12} />
                  People
                </p>

                <button
                  onClick={() =>
                    setShowCreatePerson(
                      !showCreatePerson
                    )
                  }
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700"
                >
                  <Plus size={14} />
                </button>
              </div>

              {showCreatePerson && (
                <div className="mb-4 space-y-2">
                  <input
                    placeholder="Person name"
                    value={newPerson}
                    onChange={(e) =>
                      setNewPerson(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-sm"
                  />

                  <button
                    onClick={
                      handleCreatePerson
                    }
                    className="w-full rounded-xl bg-cyan-500 text-black font-medium p-2"
                  >
                    Create Person
                  </button>
                </div>
              )}

              <div className="space-y-2 pb-4">
                {peopleItems.map(
                  (person) => {

                    const isActive =
                      person ===
                      selectedPerson;

                    return (
                      <div
                        key={person}
                        className="flex items-center gap-2"
                      >
                        <button
                          onClick={() =>
                            onPersonChange(
                              person
                            )
                          }
                          className={`flex-1 text-left rounded-3xl px-4 py-3 flex items-center gap-3 transition duration-200 ease-out ${
                            isActive
                              ? "bg-slate-800 text-cyan-300 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                              : "bg-slate-950 hover:bg-slate-900 hover:text-slate-100"
                          }`}
                        >
                          <span
                            className={`p-2 rounded-2xl ${
                              isActive
                                ? "bg-cyan-500/10 text-cyan-300"
                                : "bg-slate-900 text-slate-400"
                            }`}
                          >
                            <Users size={18} />
                          </span>

                          <span className="flex-1 text-sm font-medium truncate">
                            {person}
                          </span>
                        </button>

                        {person !== "All People" && (
                          <button
                            onClick={() =>
                              handleDeletePerson(
                                person
                              )
                            }
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

            </div>

          </nav>

          <div className="px-6 pb-6 pt-4 border-t border-slate-800">
            <div className="rounded-[24px] bg-slate-900/95 border border-slate-800 p-5">
              <p className="text-sm font-semibold text-slate-100">
                Professional Clip Management System
              </p>

              <p className="text-xs text-slate-500 mt-2">
                Upload, organize, search,
                edit and manage video
                assets with cloud storage
                integration.
              </p>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;