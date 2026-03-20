import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import ClipGrid from "../components/clips/ClipGrid";
import ClipDetailsDrawer from "../components/clips/ClipDetailsDrawer";
import UploadModal from "../components/upload/UploadModal";

import {
  getClips,
  getCategories,
  getPeople,
} from "../services/api";

function Dashboard() {
  const [clips, setClips] =
    useState<any[]>([]);

  const [categories,
    setCategories] =
    useState<string[]>([]);

  const [people,
    setPeople] =
    useState<string[]>([]);

  const [searchQuery,
    setSearchQuery] =
    useState("");

  const [selectedCategory,
    setSelectedCategory] =
    useState("All Clips");

  const [selectedPerson,
    setSelectedPerson] =
    useState("All People");

  const [selectedClip,
    setSelectedClip] =
    useState<any>(null);

  const [drawerOpen,
    setDrawerOpen] =
    useState(false);

  const [uploadOpen,
    setUploadOpen] =
    useState(false);

  const [sidebarOpen,
    setSidebarOpen] =
    useState(false);

  useEffect(() => {
    const loadData =
      async () => {
        try {
          const clipsData =
            await getClips();

          setClips(
            clipsData.clips
          );

          const categoryData =
            await getCategories();

          setCategories(
            categoryData.map(
              (c: any) =>
                c.name
            )
          );

          const peopleData =
            await getPeople();

          setPeople(
            peopleData.map(
              (p: any) =>
                p.name
            )
          );
        } catch (error) {
          console.error(
            error
          );
        }
      };

    loadData();
  }, []);

  const filteredClips =
    clips.filter(
      (clip) => {

        const matchesSearch =
          clip.title
            ?.toLowerCase()
            .includes(
              searchQuery.toLowerCase()
            ) ||
          clip.description
            ?.toLowerCase()
            .includes(
              searchQuery.toLowerCase()
            );

        const matchesCategory =
          selectedCategory ===
            "All Clips" ||
          clip.category ===
            selectedCategory;

        const matchesPerson =
          selectedPerson ===
            "All People" ||
          clip.people?.includes(
            selectedPerson
          );

        return (
          matchesSearch &&
          matchesCategory &&
          matchesPerson
        );
      }
    );

  const totalStorage =
    clips.reduce(
      (
        sum,
        clip
      ) =>
        sum +
        (clip.file_size ||
          0),
      0
    );

  const formatStorage = (
    bytes: number
  ) => {
    if (
      bytes >=
      1000 *
        1000 *
        1000
    ) {
      return `${(
        bytes /
        1000 /
        1000 /
        1000
      ).toFixed(2)} GB`;
    }

    if (
      bytes >=
      1000 * 1000
    ) {
      return `${(
        bytes /
        1000 /
        1000
      ).toFixed(2)} MB`;
    }

    if (
      bytes >= 1000
    ) {
      return `${(
        bytes /
        1000
      ).toFixed(2)} KB`;
    }

    return `${bytes} B`;
  };
  return (
    <div className="flex h-screen bg-slate-950 text-white">

      <Sidebar
        categories={
          categories
        }
        people={
          people
        }
        selectedCategory={
          selectedCategory
        }
        selectedPerson={
          selectedPerson
        }
        onCategoryChange={(
          category
        ) => {
          setSelectedCategory(
            category
          );

          setSidebarOpen(
            false
          );
        }}
        onPersonChange={(
          person
        ) => {
          setSelectedPerson(
            person
          );

          setSidebarOpen(
            false
          );
        }}
        isOpen={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false
          )
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden">

        <Topbar
          searchQuery={
            searchQuery
          }
          onSearchChange={
            setSearchQuery
          }
          onUpload={() => {
            setUploadOpen(
              true
            );
          }}
          onRefresh={() => {
            window.location.reload();
          }}
          onMenuClick={() =>
            setSidebarOpen(
              !sidebarOpen
            )
          }
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-slate-500 text-sm">
                Total Clips
              </p>

              <h2 className="text-2xl md:text-3xl font-bold mt-1">
                {clips.length}
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-slate-500 text-sm">
                Categories
              </p>

              <h2 className="text-2xl md:text-3xl font-bold mt-1">
                {categories.length}
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-slate-500 text-sm">
                People
              </p>

              <h2 className="text-2xl md:text-3xl font-bold mt-1">
                {people.length}
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-slate-500 text-sm">
                Storage Used
              </p>

              <h2 className="text-xl md:text-3xl font-bold mt-1">
                {formatStorage(
                  totalStorage
                )}
              </h2>
            </div>

          </div>

          <ClipGrid
            clips={
              filteredClips
            }
            onClipClick={(
              clip
            ) => {
              setSelectedClip(
                clip
              );

              setDrawerOpen(
                true
              );
            }}
          />
        </main>

        <ClipDetailsDrawer
          clip={
            selectedClip
          }
          isOpen={
            drawerOpen
          }
          onClose={() => {
            setDrawerOpen(
              false
            );

            setSelectedClip(
              null
            );
          }}
        />

        <UploadModal
          isOpen={
            uploadOpen
          }
          onClose={() =>
            setUploadOpen(
              false
            )
          }
        />

      </div>
    </div>
  );
}

export default Dashboard;