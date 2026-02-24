namespace CafeUygulamasi.Models
{
	public class Product
	{
		public string Id { get; set; } = Guid.NewGuid().ToString();
		public string Name { get; set; }
		public string Description { get; set; }
		public decimal Price { get; set; }
		public decimal? DiscountedPrice { get; set; }
		public bool InStock { get; set; }
		public string ImageUrl { get; set; }
		public ProductNutrition Nutrition { get; set; } = new();

		public string? CategoryId { get; set; }
		public Category? Category { get; set; }
	}

	public class ProductNutrition
	{
		public bool HasValue { get; set; } = true;
		public string? ServingSize { get; set; }
		public int? CaloriesKcal { get; set; }
		public ProductMacros Macros { get; set; } = new();
		public ProductNutritionDetails Details { get; set; } = new();
		public List<string> Allergens { get; set; } = new();
	}

	public class ProductMacros
	{
		public bool HasValue { get; set; } = true;
		public decimal? ProteinG { get; set; }
		public decimal? CarbsG { get; set; }
		public decimal? FatG { get; set; }
	}

	public class ProductNutritionDetails
	{
		public bool HasValue { get; set; } = true;
		public decimal? SugarG { get; set; }
		public decimal? FiberG { get; set; }
		public decimal? SodiumMg { get; set; }
		public int? EnergyKj { get; set; }
	}
}
