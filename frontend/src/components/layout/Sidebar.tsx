import { AnimatePresence, m } from "framer-motion";
import {
  CircleDot,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

import {
  useCreateCategoryMutation,
  useCreatePersonMutation,
  useDeleteCategoryMutation,
  useDeletePersonMutation,
} from "@/hooks/use-clips-queries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  backdropVariants,
  buttonTap,
  motionTransition,
  sidebarLeftVariants,
  sidebarExpand,
  tweenFast,
  tweenSurface,
  tweenUi,
} from "@/lib/motion";
import { SlyvrBrandLink } from "@/components/layout/SlyvrBrandLink";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  categories: string[];
  people: string[];
  selectedCategory: string;
  selectedPerson: string;
  onCategoryChange: (category: string) => void;
  onPersonChange: (person: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

function NavRow({
  label,
  active,
  icon: Icon,
  onSelect,
  onDelete,
  reduced,
  activeLayoutId,
}: {
  label: string;
  active: boolean;
  icon: typeof Layers;
  onSelect: () => void;
  onDelete?: () => void;
  reduced: boolean;
  activeLayoutId: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <m.button
        type="button"
        onClick={onSelect}
        whileTap={reduced ? undefined : buttonTap}
        whileHover={reduced ? undefined : { x: 1 }}
        transition={tweenFast}
        aria-current={active ? "true" : undefined}
        className={cn(
          "relative flex min-h-10 flex-1 items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
          "text-[var(--clip-muted)] hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]",
          active && "bg-[var(--clip-surface)] text-[var(--clip-fg)]",
        )}
      >
        {active && !reduced && (
          <m.span
            layoutId={activeLayoutId}
            className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--clip-accent)]"
            transition={tweenFast}
            aria-hidden
          />
        )}
        {active && reduced && (
          <span
            className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--clip-accent)]"
            aria-hidden
          />
        )}
        <Icon size={16} className="shrink-0 opacity-80" aria-hidden />
        <span className="flex-1 truncate">{label}</span>
      </m.button>
      {onDelete && (
        <m.button
          type="button"
          onClick={onDelete}
          whileTap={reduced ? undefined : buttonTap}
          className="min-h-10 min-w-10 rounded-md text-[var(--clip-muted)] hover:bg-[var(--clip-surface)] hover:text-red-300"
          aria-label={`Delete ${label}`}
        >
          <Trash2 size={15} />
        </m.button>
      )}
    </div>
  );
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
  isLoading,
}: SidebarProps) => {
  const reducedMotion = useReducedMotion();
  const transition = motionTransition(reducedMotion, tweenSurface);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const navItems = ["All Clips", ...new Set(categories)];
  const peopleItems = ["All People", ...new Set(people)];

  const [newCategory, setNewCategory] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreatePerson, setShowCreatePerson] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "category" | "person"; name: string } | null
  >(null);

  const createCategoryMutation = useCreateCategoryMutation();
  const createPersonMutation = useCreatePersonMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const deletePersonMutation = useDeletePersonMutation();

  const handleCreateCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    await createCategoryMutation.mutateAsync(name);
    setNewCategory("");
    setShowCreateCategory(false);
  };

  const handleCreatePerson = async () => {
    const name = newPerson.trim();
    if (!name) return;
    await createPersonMutation.mutateAsync(name);
    setNewPerson("");
    setShowCreatePerson(false);
  };

  const requestDeleteCategory = (category: string) => {
    if (category === "All Clips") return;
    setDeleteTarget({ kind: "category", name: category });
  };

  const requestDeletePerson = (person: string) => {
    if (person === "All People") return;
    setDeleteTarget({ kind: "person", name: person });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "category") {
        await deleteCategoryMutation.mutateAsync(deleteTarget.name);
        if (selectedCategory === deleteTarget.name) {
          onCategoryChange("All Clips");
        }
      } else {
        await deletePersonMutation.mutateAsync(deleteTarget.name);
        if (selectedPerson === deleteTarget.name) {
          onPersonChange("All People");
        }
      }
      setDeleteTarget(null);
    } catch {
      /* mutation toast handles errors */
    }
  };

  const deleteLoading =
    deleteCategoryMutation.isPending || deletePersonMutation.isPending;

  const panel = (
    <aside
      className={cn(
        "flex h-full w-[260px] flex-col border-r border-[var(--clip-border)] bg-[var(--clip-bg-elevated)]",
        "md:relative md:translate-x-0",
        "fixed z-50 md:z-auto",
      )}
      aria-label="Library filters"
    >
      <div className="border-b border-[var(--clip-border)] px-4 py-3">
        <SlyvrBrandLink onNavigate={onClose} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-4 text-meta">
              <Loader2 className="animate-spin" size={16} />
              Loading filters…
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-label">Categories</p>
                <m.button
                  type="button"
                  onClick={() => setShowCreateCategory(!showCreateCategory)}
                  whileTap={reducedMotion ? undefined : buttonTap}
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-md border border-transparent hover:border-[var(--clip-border)] hover:bg-[var(--clip-surface)]"
                  aria-label="Add category"
                >
                  <m.span
                    animate={{ rotate: showCreateCategory ? 45 : 0 }}
                    transition={tweenFast}
                  >
                    <Plus size={15} />
                  </m.span>
                </m.button>
              </div>

              <AnimatePresence initial={false}>
                {showCreateCategory && (
                  <m.div
                    key="create-cat"
                    variants={sidebarExpand}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: reducedMotion ? 0 : 0.22 }}
                    className="mb-3 space-y-2 overflow-hidden px-2"
                  >
                    <input
                      placeholder="Category name"
                      value={newCategory}
                      className="surface-inset w-full"
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={createCategoryMutation.isPending}
                      className="min-h-10 w-full rounded-md bg-[var(--clip-accent)] text-sm font-medium text-[var(--clip-accent-fg)] disabled:opacity-50"
                    >
                      {createCategoryMutation.isPending ? "Creating…" : "Create"}
                    </button>
                  </m.div>
                )}
              </AnimatePresence>

              <m.div layout={!reducedMotion} className="space-y-0.5 pb-5">
                <AnimatePresence initial={false}>
                  {navItems.map((category) => (
                    <m.div
                      key={category}
                      layout={!reducedMotion}
                      initial={reducedMotion ? false : { opacity: 0, x: -8, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      exit={
                        reducedMotion
                          ? undefined
                          : { opacity: 0, x: -8, height: 0, marginBottom: 0 }
                      }
                      transition={tweenFast}
                    >
                      <NavRow
                        label={category}
                        active={category === selectedCategory}
                        icon={category === "All Clips" ? Layers : CircleDot}
                        onSelect={() => onCategoryChange(category)}
                        onDelete={
                          category !== "All Clips"
                            ? () => requestDeleteCategory(category)
                            : undefined
                        }
                        reduced={reducedMotion}
                        activeLayoutId="sidebar-category-active"
                      />
                    </m.div>
                  ))}
                </AnimatePresence>
              </m.div>

              <div className="divider-h mx-2 mb-4" />

              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-label flex items-center gap-1.5">
                  <Users size={12} aria-hidden />
                  People
                </p>
                <m.button
                  type="button"
                  onClick={() => setShowCreatePerson(!showCreatePerson)}
                  whileTap={reducedMotion ? undefined : buttonTap}
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-md border border-transparent hover:border-[var(--clip-border)] hover:bg-[var(--clip-surface)]"
                  aria-label="Add person"
                >
                  <m.span
                    animate={{ rotate: showCreatePerson ? 45 : 0 }}
                    transition={tweenFast}
                  >
                    <Plus size={15} />
                  </m.span>
                </m.button>
              </div>

              <AnimatePresence initial={false}>
                {showCreatePerson && (
                  <m.div
                    key="create-person"
                    variants={sidebarExpand}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: reducedMotion ? 0 : 0.22 }}
                    className="mb-3 space-y-2 overflow-hidden px-2"
                  >
                    <input
                      placeholder="Person name"
                      value={newPerson}
                      className="surface-inset w-full"
                      onChange={(e) => setNewPerson(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleCreatePerson}
                      disabled={createPersonMutation.isPending}
                      className="min-h-10 w-full rounded-md bg-[var(--clip-accent)] text-sm font-medium text-[var(--clip-accent-fg)] disabled:opacity-50"
                    >
                      {createPersonMutation.isPending ? "Creating…" : "Create"}
                    </button>
                  </m.div>
                )}
              </AnimatePresence>

              <m.div layout={!reducedMotion} className="space-y-0.5 pb-4">
                <AnimatePresence initial={false}>
                  {peopleItems.map((person) => (
                    <m.div
                      key={person}
                      layout={!reducedMotion}
                      initial={reducedMotion ? false : { opacity: 0, x: -8, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      exit={
                        reducedMotion
                          ? undefined
                          : { opacity: 0, x: -8, height: 0, marginBottom: 0 }
                      }
                      transition={tweenFast}
                    >
                      <NavRow
                        label={person}
                        active={person === selectedPerson}
                        icon={Users}
                        onSelect={() => onPersonChange(person)}
                        onDelete={
                          person !== "All People"
                            ? () => requestDeletePerson(person)
                            : undefined
                        }
                        reduced={reducedMotion}
                        activeLayoutId="sidebar-person-active"
                      />
                    </m.div>
                  ))}
                </AnimatePresence>
              </m.div>
            </>
          )}
        </nav>
      </div>
    </aside>
  );

  return (
    <>
      <ConfirmDialog
        open={deleteTarget != null}
        title={
          deleteTarget?.kind === "category"
            ? "Delete this category?"
            : "Remove this person?"
        }
        description={
          deleteTarget?.kind === "category"
            ? `Clips will keep their files, but the “${deleteTarget.name}” category label will be removed from your filters.`
            : `“${deleteTarget?.name ?? ""}” will be removed from your people list. Clips already tagged will keep their metadata until you edit them.`
        }
        confirmLabel={
          deleteTarget?.kind === "category" ? "Delete category" : "Remove person"
        }
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <AnimatePresence>
        {isOpen && (
          <m.button
            type="button"
            key="sidebar-backdrop"
            className="fixed inset-0 z-40 bg-black/55 md:hidden"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={motionTransition(reducedMotion, tweenUi)}
            onClick={onClose}
            aria-label="Close navigation"
          />
        )}
      </AnimatePresence>

      {isDesktop ? (
        <div className="h-full shrink-0">{panel}</div>
      ) : (
        <AnimatePresence>
          {isOpen && (
            <m.div
              key="sidebar-mobile"
              className="fixed inset-y-0 left-0 z-50"
              variants={sidebarLeftVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
            >
              {panel}
            </m.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export default Sidebar;
