import api from "./api";

const uploadService = {
  /**
   * Upload a product image file.
   * Returns the full URL to store in image_url column.
   * @param {File} file
   * @returns {Promise<string>} imageUrl
   */
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const { data } = await api.post("/upload/product-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.imageUrl;
  },
  /**
   * Upload a news cover image file.
   * Returns the full URL to store in cover_image_url column.
   * @param {File} file
   * @returns {Promise<string>} imageUrl
   */
  uploadNewsCover: async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const { data } = await api.post("/upload/news-cover", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.imageUrl;
  },
};

export default uploadService;
