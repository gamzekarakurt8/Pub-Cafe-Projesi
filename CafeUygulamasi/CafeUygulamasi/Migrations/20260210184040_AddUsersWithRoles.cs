using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CafeUygulamasi.Migrations
{
    /// <inheritdoc />
    public partial class AddUsersWithRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Social_Twitter",
                table: "ContactInfos",
                newName: "Social_X");

            migrationBuilder.AddColumn<string>(
                name: "Nutrition_Allergens",
                table: "Products",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "Nutrition_CaloriesKcal",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Nutrition_Details_EnergyKj",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Nutrition_Details_FiberG",
                table: "Products",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Nutrition_Details_HasValue",
                table: "Products",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "Nutrition_Details_SodiumMg",
                table: "Products",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Nutrition_Details_SugarG",
                table: "Products",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Nutrition_HasValue",
                table: "Products",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "Nutrition_Macros_CarbsG",
                table: "Products",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Nutrition_Macros_FatG",
                table: "Products",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Nutrition_Macros_HasValue",
                table: "Products",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "Nutrition_Macros_ProteinG",
                table: "Products",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nutrition_ServingSize",
                table: "Products",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Menus",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "OrderLinks_Getir",
                table: "ContactInfos",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "OrderLinks_HasValue",
                table: "ContactInfos",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OrderLinks_TrendyolYemek",
                table: "ContactInfos",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "OrderLinks_Yemeksepeti",
                table: "ContactInfos",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "Social_HasValue",
                table: "ContactInfos",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Categories",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "OrderLinks_HasValue",
                table: "Branches",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Username = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PasswordHash = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Role = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropColumn(
                name: "Nutrition_Allergens",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_CaloriesKcal",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Details_EnergyKj",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Details_FiberG",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Details_HasValue",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Details_SodiumMg",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Details_SugarG",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_HasValue",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Macros_CarbsG",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Macros_FatG",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Macros_HasValue",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_Macros_ProteinG",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Nutrition_ServingSize",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Menus");

            migrationBuilder.DropColumn(
                name: "OrderLinks_Getir",
                table: "ContactInfos");

            migrationBuilder.DropColumn(
                name: "OrderLinks_HasValue",
                table: "ContactInfos");

            migrationBuilder.DropColumn(
                name: "OrderLinks_TrendyolYemek",
                table: "ContactInfos");

            migrationBuilder.DropColumn(
                name: "OrderLinks_Yemeksepeti",
                table: "ContactInfos");

            migrationBuilder.DropColumn(
                name: "Social_HasValue",
                table: "ContactInfos");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "OrderLinks_HasValue",
                table: "Branches");

            migrationBuilder.RenameColumn(
                name: "Social_X",
                table: "ContactInfos",
                newName: "Social_Twitter");
        }
    }
}
