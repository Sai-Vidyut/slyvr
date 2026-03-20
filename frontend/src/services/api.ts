import axios from "axios";

const api = axios.create({
  baseURL: "http://172.20.10.13:8000",
});

// --------------------
// CLIPS
// --------------------

export const getClips = async () => {
  const response = await api.get("/clips");
  return response.data;
};

export const searchClips = async (
  query: string
) => {
  const response = await api.get(
    `/clips/search?q=${query}`
  );

  return response.data;
};

export const deleteClip = async (
  id: number
) => {
  const response = await api.delete(
    `/clips/${id}`
  );

  return response.data;
};

export const updateClip = async (
  id: number,
  data: {
    title: string;
    description: string;
    category: string;
  }
) => {
  const response = await api.put(
    `/clips/${id}`,
    data
  );

  return response.data;
};

// --------------------
// CATEGORIES
// --------------------

export const getCategories = async () => {
  const response = await api.get(
    "/categories/all"
  );

  return response.data;
};

export const createCategory = async (
  name: string
) => {
  const response = await api.post(
    "/categories",
    {
      name,
    }
  );

  return response.data;
};

export const deleteCategory = async (
  name: string
) => {
  const response = await api.delete(
    `/categories/by-name/${encodeURIComponent(name)}`
  );

  return response.data;
};

// --------------------
// PEOPLE
// --------------------

export const getPeople = async () => {
  const response = await api.get(
    "/people"
  );

  return response.data;
};

export const createPerson = async (
  name: string
) => {
  const response = await api.post(
    "/people",
    {
      name,
    }
  );

  return response.data;
};

export const deletePerson = async (
  name: string
) => {
  const response = await api.delete(
    `/people/by-name/${encodeURIComponent(name)}`
  );

  return response.data;
};

export default api;