namespace CafeUygulamasi.Models
{
	    public class Category
	    {
	        public string Id { get; set; } = Guid.NewGuid().ToString();
	        public string Name { get; set; }
	        public int Order { get; set; }
	        public string ImageUrl { get; set; }

	        public string? MenuId { get; set; }
	        public Menu? Menu { get; set; }

	        public List<Product> Products { get; set; } = new();
	    }
}
