using CafeUygulamasi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Linq;

namespace CafeUygulamasi.Data;

public class CafeDbContext : DbContext
{
	public CafeDbContext(DbContextOptions<CafeDbContext> options)
	: base(options)
	{
	}

	public DbSet<Menu> Menus { get; set; }
	public DbSet<Category> Categories { get; set; }
	public DbSet<Product> Products { get; set; }
	public DbSet<Branch> Branches { get; set; }
	public DbSet<ContactRequest> ContactRequests { get; set; }
	public DbSet<ContactInfo> ContactInfos { get; set; }
	public DbSet<AppUser> Users { get; set; }
	public DbSet<PageSectionContent> PageSectionContents { get; set; }

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		modelBuilder.Entity<Branch>().OwnsOne(b => b.Location);
		modelBuilder.Entity<Branch>().OwnsOne(b => b.OrderLinks);
		modelBuilder.Entity<Branch>().Navigation(b => b.OrderLinks).IsRequired();
		modelBuilder.Entity<Branch>().OwnsMany(b => b.WorkingHours, wh =>
		{
			wh.WithOwner().HasForeignKey("BranchId");
			wh.Property<int>("Id").ValueGeneratedOnAdd();
			wh.HasKey("Id");
			wh.ToTable("BranchWorkingHours");
		});

		modelBuilder.Entity<ContactInfo>().OwnsOne(c => c.Social);
		modelBuilder.Entity<ContactInfo>().Navigation(c => c.Social).IsRequired();
		modelBuilder.Entity<ContactInfo>().OwnsOne(c => c.OrderLinks);
		modelBuilder.Entity<ContactInfo>().Navigation(c => c.OrderLinks).IsRequired();

		modelBuilder.Entity<Category>()
			.HasOne(c => c.Menu)
			.WithMany(m => m.Categories)
			.HasForeignKey(c => c.MenuId)
			.OnDelete(DeleteBehavior.SetNull);

		modelBuilder.Entity<Product>()
			.HasOne(p => p.Category)
			.WithMany(c => c.Products)
			.HasForeignKey(p => p.CategoryId)
			.OnDelete(DeleteBehavior.SetNull);

		modelBuilder.Entity<Product>().OwnsOne(p => p.Nutrition, nutrition =>
		{
			nutrition.OwnsOne(n => n.Macros);
			nutrition.OwnsOne(n => n.Details);
			nutrition.Navigation(n => n.Macros).IsRequired();
			nutrition.Navigation(n => n.Details).IsRequired();
			nutrition.Property(n => n.Allergens)
				.HasConversion(
					v => JsonSerializer.Serialize(v, new JsonSerializerOptions()),
					v => string.IsNullOrWhiteSpace(v)
						? new List<string>()
						: JsonSerializer.Deserialize<List<string>>(v, new JsonSerializerOptions()) ?? new List<string>())
				.Metadata.SetValueComparer(new ValueComparer<List<string>>(
					(a, b) => a != null && b != null && a.SequenceEqual(b),
					v => v == null ? 0 : v.Aggregate(0, (acc, cur) => HashCode.Combine(acc, cur.GetHashCode())),
					v => v == null ? new List<string>() : v.ToList()));
		});
		modelBuilder.Entity<Product>().Navigation(p => p.Nutrition).IsRequired();

		modelBuilder.Entity<AppUser>()
			.HasIndex(u => u.Username)
			.IsUnique();

		modelBuilder.Entity<PageSectionContent>()
			.HasIndex(p => p.PageKey)
			.IsUnique();

		modelBuilder.Entity<PageSectionContent>()
			.Property(p => p.Tags)
			.HasConversion(
				v => JsonSerializer.Serialize(v, new JsonSerializerOptions()),
				v => string.IsNullOrWhiteSpace(v)
					? new List<string>()
					: JsonSerializer.Deserialize<List<string>>(v, new JsonSerializerOptions()) ?? new List<string>())
			.Metadata.SetValueComparer(new ValueComparer<List<string>>(
				(a, b) => a != null && b != null && a.SequenceEqual(b),
				v => v == null ? 0 : v.Aggregate(0, (acc, cur) => HashCode.Combine(acc, cur.GetHashCode())),
				v => v == null ? new List<string>() : v.ToList()));
	}
}
