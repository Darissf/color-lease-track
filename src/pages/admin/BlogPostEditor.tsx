import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { toast } from "sonner";

export default function BlogPostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category_id: "",
    tags: "",
    status: "draft",
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchPost();
    }
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("blog_categories")
      .select("*")
      .order("display_order");
    
    setCategories(data || []);
  };

  const fetchPost = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setFormData({
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || "",
        content: data.content,
        featured_image: data.featured_image || "",
        category_id: data.category_id || "",
        tags: data.tags?.join(", ") || "",
        status: data.status,
      });
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: formData.slug || generateSlug(title),
    });
  };

  const handleSave = async (publishNow: boolean = false) => {
    if (!formData.title || !formData.content) {
      toast.error("Judul dan konten harus diisi");
      return;
    }

    setLoading(true);

    const postData = {
      title: formData.title,
      slug: formData.slug || generateSlug(formData.title),
      excerpt: formData.excerpt,
      content: formData.content,
      featured_image: formData.featured_image || null,
      category_id: formData.category_id || null,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
      status: publishNow ? "published" : formData.status,
      published_at: publishNow ? new Date().toISOString() : null,
      author_id: user?.id,
    };

    let error;

    if (isEdit) {
      const result = await supabase
        .from("blog_posts")
        .update(postData)
        .eq("id", id);
      error = result.error;
    } else {
      const result = await supabase
        .from("blog_posts")
        .insert(postData);
      error = result.error;
    }

    setLoading(false);

    if (error) {
      toast.error("Gagal menyimpan artikel");
      console.error(error);
    } else {
      toast.success(isEdit ? "Artikel berhasil diupdate" : "Artikel berhasil dibuat");
      navigate("/vip/blog-posts");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/vip/blog-posts")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {isEdit ? "Edit Artikel" : "Buat Artikel Baru"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            Simpan Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={loading}
          >
            <Eye className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Judul *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Masukkan judul artikel..."
                  className="text-2xl font-bold h-auto py-3"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug URL</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="judul-artikel"
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Ringkasan singkat artikel..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="content">Konten * (Markdown/HTML)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tulis konten artikel di sini..."
                  rows={20}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Gunakan HTML untuk formatting (h2, h3, p, ul, ol, strong, em, dll)
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Pengaturan</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="featured_image">Featured Image URL</Label>
                <Input
                  id="featured_image"
                  value={formData.featured_image}
                  onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                  placeholder="https://..."
                />
                {formData.featured_image && (
                  <img
                    src={formData.featured_image}
                    alt="Preview"
                    className="mt-2 rounded-lg w-full h-32 object-cover"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="tags">Tags (pisahkan dengan koma)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="scaffolding, tips, konstruksi"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
